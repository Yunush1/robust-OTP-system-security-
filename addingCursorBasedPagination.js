// ============================================================================
// CURSOR-BASED PAGINATION IMPLEMENTATION
// ============================================================================

const { ObjectId } = require('mongodb');

class CursorPagination {
    constructor(model) {
        this.model = model; // MongoDB model/collection
    }

    /**
     * Basic cursor pagination using _id field
     * @param {Object} options - Pagination options
     * @param {string} options.cursor - Last document's _id from previous page
     * @param {number} options.limit - Number of documents per page (default: 10)
     * @param {string} options.sortDirection - 'asc' or 'desc' (default: 'desc')
     * @param {Object} options.filter - Additional filters to apply
     * @returns {Promise<Object>} - Paginated results with metadata
     */
    async paginateById(options = {}) {
        const {
            cursor = null,
            limit = 10,
            sortDirection = 'desc',
            filter = {}
        } = options;

        try {
            // Build base query
            let query = { ...filter };

            // Add cursor condition
            if (cursor) {
                const cursorId = new ObjectId(cursor);
                query._id = sortDirection === 'desc' 
                    ? { $lt: cursorId }  // Less than for descending
                    : { $gt: cursorId }; // Greater than for ascending
            }

            // Execute query with limit + 1 to check if there are more results
            const documents = await this.model
                .find(query)
                .sort({ _id: sortDirection === 'desc' ? -1 : 1 })
                .limit(limit + 1)
                .toArray();

            // Check if there are more results
            const hasMore = documents.length > limit;
            if (hasMore) {
                documents.pop(); // Remove the extra document
            }

            // Get next cursor
            const nextCursor = documents.length > 0 
                ? documents[documents.length - 1]._id.toString()
                : null;

            return {
                data: documents,
                pagination: {
                    hasMore,
                    nextCursor,
                    limit,
                    count: documents.length
                }
            };

        } catch (error) {
            throw new Error(`Pagination error: ${error.message}`);
        }
    }

    /**
     * Advanced cursor pagination using custom field (e.g., createdAt, score)
     * @param {Object} options - Pagination options
     * @param {string} options.cursor - Encoded cursor string
     * @param {number} options.limit - Number of documents per page
     * @param {string} options.sortField - Field to sort by (default: 'createdAt')
     * @param {string} options.sortDirection - 'asc' or 'desc'
     * @param {Object} options.filter - Additional filters
     * @returns {Promise<Object>} - Paginated results with metadata
     */
    async paginateByField(options = {}) {
        const {
            cursor = null,
            limit = 10,
            sortField = 'createdAt',
            sortDirection = 'desc',
            filter = {}
        } = options;

        try {
            let query = { ...filter };
            let sort = {};

            // Decode cursor if provided
            if (cursor) {
                const decodedCursor = this.decodeCursor(cursor);
                
                // Build comparison query
                if (sortDirection === 'desc') {
                    query[sortField] = { $lt: decodedCursor.value };
                } else {
                    query[sortField] = { $gt: decodedCursor.value };
                }

                // Add _id as tiebreaker for consistent pagination
                if (decodedCursor.id) {
                    if (query[sortField].$lt) {
                        query.$or = [
                            { [sortField]: { $lt: decodedCursor.value } },
                            { 
                                [sortField]: decodedCursor.value,
                                _id: { $lt: new ObjectId(decodedCursor.id) }
                            }
                        ];
                        delete query[sortField];
                    } else if (query[sortField].$gt) {
                        query.$or = [
                            { [sortField]: { $gt: decodedCursor.value } },
                            { 
                                [sortField]: decodedCursor.value,
                                _id: { $gt: new ObjectId(decodedCursor.id) }
                            }
                        ];
                        delete query[sortField];
                    }
                }
            }

            // Set sort order
            sort[sortField] = sortDirection === 'desc' ? -1 : 1;
            sort._id = sortDirection === 'desc' ? -1 : 1; // Tiebreaker

            // Execute query
            const documents = await this.model
                .find(query)
                .sort(sort)
                .limit(limit + 1)
                .toArray();

            const hasMore = documents.length > limit;
            if (hasMore) {
                documents.pop();
            }

            // Generate next cursor
            const nextCursor = documents.length > 0
                ? this.encodeCursor(documents[documents.length - 1], sortField)
                : null;

            return {
                data: documents,
                pagination: {
                    hasMore,
                    nextCursor,
                    limit,
                    count: documents.length,
                    sortField,
                    sortDirection
                }
            };

        } catch (error) {
            throw new Error(`Advanced pagination error: ${error.message}`);
        }
    }

    /**
     * Bidirectional pagination (forward and backward)
     * @param {Object} options - Pagination options
     * @param {string} options.after - Cursor for forward pagination
     * @param {string} options.before - Cursor for backward pagination
     * @param {number} options.first - Number of documents forward
     * @param {number} options.last - Number of documents backward
     * @param {string} options.sortField - Field to sort by
     * @param {Object} options.filter - Additional filters
     * @returns {Promise<Object>} - Paginated results with metadata
     */
    async bidirectionalPaginate(options = {}) {
        const {
            after = null,
            before = null,
            first = null,
            last = null,
            sortField = 'createdAt',
            filter = {}
        } = options;

        // Validate input
        if ((first && last) || (!first && !last)) {
            throw new Error('Specify either "first" or "last", not both');
        }

        if ((after && before)) {
            throw new Error('Cannot use "after" and "before" cursors together');
        }

        try {
            let query = { ...filter };
            let sort = {};
            let limit = first || last;
            let isForward = !!first;

            // Handle cursor conditions
            if (after) {
                const decodedCursor = this.decodeCursor(after);
                query.$or = [
                    { [sortField]: { $lt: decodedCursor.value } },
                    { 
                        [sortField]: decodedCursor.value,
                        _id: { $lt: new ObjectId(decodedCursor.id) }
                    }
                ];
            } else if (before) {
                const decodedCursor = this.decodeCursor(before);
                query.$or = [
                    { [sortField]: { $gt: decodedCursor.value } },
                    { 
                        [sortField]: decodedCursor.value,
                        _id: { $gt: new ObjectId(decodedCursor.id) }
                    }
                ];
                isForward = false;
            }

            // Set sort order
            sort[sortField] = isForward ? -1 : 1;
            sort._id = isForward ? -1 : 1;

            // Execute query
            let documents = await this.model
                .find(query)
                .sort(sort)
                .limit(limit + 1)
                .toArray();

            const hasMore = documents.length > limit;
            if (hasMore) {
                documents.pop();
            }

            // Reverse results if backward pagination
            if (!isForward) {
                documents.reverse();
            }

            // Generate cursors
            const startCursor = documents.length > 0
                ? this.encodeCursor(documents[0], sortField)
                : null;
            
            const endCursor = documents.length > 0
                ? this.encodeCursor(documents[documents.length - 1], sortField)
                : null;

            return {
                data: documents,
                pageInfo: {
                    hasNextPage: isForward ? hasMore : false,
                    hasPreviousPage: !isForward ? hasMore : false,
                    startCursor,
                    endCursor
                },
                totalCount: documents.length
            };

        } catch (error) {
            throw new Error(`Bidirectional pagination error: ${error.message}`);
        }
    }

    /**
     * Encode cursor from document and sort field
     * @param {Object} document - MongoDB document
     * @param {string} sortField - Field used for sorting
     * @returns {string} - Encoded cursor
     */
    encodeCursor(document, sortField) {
        const cursorData = {
            id: document._id.toString(),
            value: document[sortField]
        };
        return Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    /**
     * Decode cursor string
     * @param {string} cursor - Encoded cursor string
     * @returns {Object} - Decoded cursor data
     */
    decodeCursor(cursor) {
        try {
            const decoded = Buffer.from(cursor, 'base64').toString('utf8');
            return JSON.parse(decoded);
        } catch (error) {
            throw new Error('Invalid cursor format');
        }
    }
}

// ============================================================================
// EXPRESS.JS ROUTE EXAMPLES
// ============================================================================

const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();

// Initialize pagination class
let postsCollection;
let usersPagination;

// MongoDB connection setup
MongoClient.connect('mongodb://localhost:27017/your-database')
    .then(client => {
        const db = client.db();
        postsCollection = db.collection('posts');
        usersPagination = new CursorPagination(postsCollection);
    });

/**
 * GET /posts - Basic cursor pagination by _id
 * Query params: cursor, limit, sortDirection
 */
router.get('/posts', async (req, res) => {
    try {
        const { cursor, limit = 10, sortDirection = 'desc' } = req.query;

        const result = await usersPagination.paginateById({
            cursor,
            limit: parseInt(limit),
            sortDirection,
            filter: { status: 'published' } // Additional filters
        });

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /posts/advanced - Advanced cursor pagination by custom field
 * Query params: cursor, limit, sortField, sortDirection
 */
router.get('/posts/advanced', async (req, res) => {
    try {
        const { 
            cursor, 
            limit = 10, 
            sortField = 'createdAt',
            sortDirection = 'desc' 
        } = req.query;

        const result = await usersPagination.paginateByField({
            cursor,
            limit: parseInt(limit),
            sortField,
            sortDirection,
            filter: { 
                status: 'published',
                author: { $exists: true }
            }
        });

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /posts/bidirectional - GraphQL-style bidirectional pagination
 * Query params: after, before, first, last
 */
router.get('/posts/bidirectional', async (req, res) => {
    try {
        const { after, before, first, last } = req.query;

        const result = await usersPagination.bidirectionalPaginate({
            after,
            before,
            first: first ? parseInt(first) : null,
            last: last ? parseInt(last) : null,
            sortField: 'createdAt',
            filter: { status: 'published' }
        });

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// USAGE EXAMPLES WITH FRONTEND
// ============================================================================

/*
// Frontend usage example (JavaScript)
class ApiClient {
    async getPosts(cursor = null, limit = 10) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });
        
        if (cursor) {
            params.append('cursor', cursor);
        }

        const response = await fetch(`/api/posts?${params}`);
        return response.json();
    }

    async loadMorePosts(existingPosts, cursor) {
        const result = await this.getPosts(cursor);
        return {
            posts: [...existingPosts, ...result.data],
            hasMore: result.pagination.hasMore,
            nextCursor: result.pagination.nextCursor
        };
    }
}

// React component example
const PostsList = () => {
    const [posts, setPosts] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadMore = async () => {
        setLoading(true);
        try {
            const result = await apiClient.loadMorePosts(posts, nextCursor);
            setPosts(result.posts);
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {posts.map(post => <PostItem key={post._id} post={post} />)}
            {hasMore && (
                <button onClick={loadMore} disabled={loading}>
                    {loading ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
};
*/

module.exports = { CursorPagination, router };
