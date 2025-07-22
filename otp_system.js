const nodemailer = require("nodemailer");
const _ = require("lodash");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
module.exports = {
    /**
     * Reusable function to add and update specific points/values in the user_activity_summary and trainer_activity_summary
     * @param {number} userId - The ID of the user
     * @param {string} field - The field to update in the summary (e.g
     * @param {number} valueToAdd - The value to add to the existing field
     * @param {boolean} isTrainer - Whether the user is a trainer (to update trainer activity summary)
     * @return {Promise<void>}
     * */
    // async sendOtpOnEmail(ctx) {
    //     try {
    //         const { email: emailID } = ctx.request.body;

    //         const email = emailID?.toLowerCase().trim();

    //         if (!email) {
    //             return ctx.badRequest("Email is required");
    //         }
    //         let user;
    //         try {
    //             user = await strapi.query("plugin::users-permissions.user").findOne({
    //                 where: { email },
    //             });
    //         } catch (error) {
    //             return ctx.notFound("User not found");;
    //         }
    //         if (!user) {
    //             return ctx.notFound("User not found");
    //         }

    //         // Check if an OTP has already been sent to this email
    //         // and if it is still valid
    //         // If an OTP exists and is not verified, check if it has expired
    //         // If it has not expired, return an error message
    //         let otpData;
    //         try {
    //             otpData = await strapi.entityService.findMany("api::otp-verification.otp-verification", {
    //                 filters: { email: email, is_verified: false },
    //                 sort: { createdAt: "DESC" }, // Get the most recent OTP
    //                 fields: ["otp_number", "expires_in"],
    //                 pagination: { pageSize: 1, page: 1 },
    //             });
    //             if (otpData.length > 0) {
    //                 const lastOtp = otpData[0];
    //                 if (new Date(lastOtp.expires_in) > new Date()) {
    //                     return ctx.badRequest("An OTP has already been sent to this email. Please wait for it to expire.");
    //                 }
    //             }
    //         } catch (error) {
    //             console.error("Error fetching OTP data:", error);
    //             // return ctx.internalServerError("Failed to check existing OTP data");
    //         }
    //         if(otpData.length > 0) {
    //             const lastOtp = otpData[0];
    //             if(lastOtp.otp_count >= 3) {
    //                 return ctx.badRequest("You have reached the maximum number of attempts. Please try again later.");
    //             }
    //         }

    //         const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    //         const hashedOtp = crypto.createHash("sha256").update(otp.toString()).digest("hex"); // Hash the OTP for storage
    //         const otpPayload = {
    //             email: email,
    //             otp_number: hashedOtp,
    //             is_verified: false,
    //             otp_count: otpData.length + 1,
    //             expires_in: new Date(Date.now() + 2 * 60 * 1000) // OTP valid for 10 minutes
    //         };
    //         // Save OTP data
    //         try {
    //             sendOTPEmail({ user, otp });
    //             await strapi.entityService.create("api::otp-verification.otp-verification", {
    //                 data: otpPayload,
    //             });
    //         } catch (error) {
    //             console.error("Error saving OTP data:", error);
    //             return ctx.internalServerError("Failed to save OTP data");
    //         }
    //         return ctx.send({ message: "OTP sent successfully" });
    //     } catch (error) {
    //         console.error("Error sending OTP:", error);
    //         return ctx.internalServerError("Failed to send OTP");
    //     }
    // },
    // async verifyOtp(ctx) {
    //     try {
    //         const { email, otp } = ctx.request.body;
    //         if (!email || !otp) {
    //             return ctx.badRequest("Email and OTP are required");
    //         }
    //         let otpData = await strapi.entityService.findMany("api::otp-verification.otp-verification", {
    //             filters: { email: email, is_verified: false },
    //             sort: { createdAt: "DESC" }, // Get the most recent OTP
    //             fields: ["otp_number", "expires_in"],
    //             pagination: { pageSize: 1, page: 1 },
    //         });

    //         if (!otpData) {
    //             return ctx.badRequest("Invalid or expired OTP");
    //         }
    //         let lastOtp = otpData[0];

    //         if (!lastOtp) {
    //             return ctx.badRequest("No OTP found for this email");
    //         }
    //         // Check if the OTP is still valid
    //         if (new Date(lastOtp.expires_in) < new Date()) {
    //             return ctx.badRequest("This OTP has expired.");
    //         }
    //         // Compare the hashed OTP with the stored OTP
    //         const hashedOtp = crypto.createHash("sha256").update(otp.toString().trim()).digest("hex");
    //         if (lastOtp.otp_number !== hashedOtp) {
    //             await strapi.entityService.update(
    //             "api::otp-verification.otp-verification",
    //             lastOtp.id,
    //             { data: { blockUntil: new Date() + 5 * 60 * 1000 } },
    //         );
    //             return ctx.badRequest("Invalid OTP");
    //         }
    //         // If the OTP is valid, mark it as verified
    //         await strapi.entityService.update(
    //             "api::otp-verification.otp-verification",
    //             lastOtp.id,
    //             { data: { is_verified: true } },
    //         );
    //         const user = await authenticateUserAndSendToken({ email });
    //         return ctx.send({ message: "OTP verified successfully", data: user });
    //     } catch (error) {
    //         console.error("Error verifying OTP:", error);
    //         return ctx.internalServerError("Failed to verify OTP");
    //     }
    // }


    async sendOtpOnEmail(ctx) {
        try {
            const { email: emailID } = ctx.request.body;
            const email = emailID?.toLowerCase().trim();

            if (!email) {
                return ctx.badRequest("Email is required");
            }

            let user;
            try {
                user = await strapi.query("plugin::users-permissions.user").findOne({
                    where: { email },
                });
            } catch (error) {
                return ctx.notFound("User not found");
            }

            if (!user) {
                return ctx.notFound("User not found");
            }

            // Get all OTP records for this email in the last 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            let otpRecords;

            try {
                otpRecords = await strapi.entityService.findMany("api::otp-verification.otp-verification", {
                    filters: {
                        email: email,
                        is_verified: false,
                        createdAt: { $gte: twentyFourHoursAgo.toISOString() }
                    },
                    sort: { createdAt: "DESC" },
                    fields: ["otp_number", "expires_in", "createdAt", "otp_count"],
                });
            } catch (error) {
                console.error("Error fetching OTP data:", error);
                return ctx.internalServerError("Failed to check existing OTP data");
            }

            const currentTime = new Date();
            const totalAttempts = otpRecords.length;

            // Check if user is in 24-hour block period (more than 7 attempts)
            if (totalAttempts >= 7) {
                const oldestAttemptTime = new Date(otpRecords[otpRecords.length - 1].createdAt);
                const timeSinceOldest = currentTime - oldestAttemptTime;
                const remainingBlockTime = (24 * 60 * 60 * 1000) - timeSinceOldest;

                if (remainingBlockTime > 0) {
                    const hoursRemaining = Math.ceil(remainingBlockTime / (60 * 60 * 1000));
                    return ctx.badRequest(`You have been blocked from requesting OTP. Please try again after ${hoursRemaining} hours.`);
                }
            }

            // Check for active (non-expired) OTP
            const activeOtp = otpRecords.find(record => new Date(record.expires_in) > currentTime);
            if (activeOtp) {
                const timeRemaining = Math.ceil((new Date(activeOtp.expires_in) - currentTime) / 1000 / 60);
                return ctx.badRequest(`An active OTP already exists. Please wait ${timeRemaining} minutes before requesting a new one.`);
            }

            // Progressive delay logic
            if (totalAttempts >= 3) {
                const lastAttempt = otpRecords[0];
                const lastAttemptTime = new Date(lastAttempt.createdAt);

                // Calculate required delay based on attempt number
                let requiredDelayMinutes;
                switch (totalAttempts) {
                    case 3:
                        requiredDelayMinutes = 5;
                        break;
                    case 4:
                        requiredDelayMinutes = 10;
                        break;
                    case 5:
                        requiredDelayMinutes = 20;
                        break;
                    case 6:
                        requiredDelayMinutes = 40;
                        break;
                    default:
                        requiredDelayMinutes = 80;
                }

                const timeSinceLastAttempt = currentTime - lastAttemptTime;
                const requiredDelayMs = requiredDelayMinutes * 60 * 1000;

                if (timeSinceLastAttempt < requiredDelayMs) {
                    const remainingWaitTime = Math.ceil((requiredDelayMs - timeSinceLastAttempt) / 1000 / 60);
                    return ctx.badRequest(`Please wait ${remainingWaitTime} minutes before requesting another OTP.`);
                }
            }

            // Generate and send OTP
            const otp = Math.floor(100000 + Math.random() * 900000);
            const hashedOtp = crypto.createHash("sha256").update(otp.toString()).digest("hex");

            const otpPayload = {
                email: email,
                otp_number: hashedOtp,
                is_verified: false,
                otp_count: totalAttempts + 1,
                expires_in: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes validity
            };

            try {
                await sendOTPEmail({ user, otp });
                await strapi.entityService.create("api::otp-verification.otp-verification", {
                    data: otpPayload,
                });
            } catch (error) {
                console.error("Error saving OTP data:", error);
                return ctx.internalServerError("Failed to save OTP data");
            }

            return ctx.send({
                message: "OTP sent successfully",
                attempt: totalAttempts + 1,
                ...(totalAttempts >= 2 && {
                    warning: totalAttempts >= 6
                        ? "This is your final attempt before being blocked for 24 hours."
                        : `Next OTP request will have a ${getNextDelayMinutes(totalAttempts + 1)} minute delay.`
                })
            });

        } catch (error) {
            console.error("Error sending OTP:", error);
            return ctx.internalServerError("Failed to send OTP");
        }
    },

    // Helper function to get next delay time
    async cleanupOldOtpRecords() {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 0 * 60 * 1000);

            await strapi.entityService.deleteMany("api::otp-verification.otp-verification", {
                filters: {
                    createdAt: { $lt: twentyFourHoursAgo.toISOString() }
                }
            });

            console.log("Old OTP records cleaned up successfully");
        } catch (error) {
            console.error("Error cleaning up old OTP records:", error);
        }
    },

    async verifyOtp(ctx) {
        try {
            const { email, otp } = ctx.request.body;

            // Input validation
            if (!email || !otp) {
                return ctx.badRequest("Email and OTP are required");
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return ctx.badRequest("Invalid email format");
            }

            // Validate OTP format (assuming 6 digit numeric OTP)
            if (!/^\d{4,8}$/.test(otp.toString().trim())) {
                return ctx.badRequest("Invalid OTP format");
            }

            // Hash the provided OTP once
            const hashedOtp = crypto.createHash("sha256").update(otp.toString().trim()).digest("hex");

            // Find the most recent unverified OTP for this email
            const otpData = await strapi.entityService.findMany("api::otp-verification.otp-verification", {
                filters: {
                    email: email.toLowerCase().trim(),
                    is_verified: false,
                },
                sort: { createdAt: "DESC" },
                fields: ["id", "otp_number", "expires_in", "attempt_count"],
                pagination: { pageSize: 1, page: 1 },
            });
            console.log("otpData", otpData);
            const lastOtp = otpData[0];
            if (!lastOtp) {
                return ctx.badRequest("No valid OTP found for this email");
            }

            // Check if OTP has expired
            const currentTime = new Date();
            const expirationTime = new Date(lastOtp.expires_in);
            if (expirationTime < currentTime) {
                // Mark expired OTP as verified to prevent reuse
                await strapi.entityService.update(
                    "api::otp-verification.otp-verification",
                    lastOtp.id,
                    { data: { is_verified: true } }
                );
                return ctx.badRequest("OTP has expired. Please request a new one.");
            }

            // Check for rate limiting (max 3 attempts)
            const maxAttempts = 3;
            const currentAttempts = (lastOtp.attempt_count || 0) + 1;

            if (currentAttempts > maxAttempts) {
                // Block OTP for 5 minutes
                await strapi.entityService.update(
                    "api::otp-verification.otp-verification",
                    lastOtp.id,
                    {
                        data: {
                            blockUntil: new Date(Date.now() + 5 * 60 * 1000),
                            attempt_count: currentAttempts
                        }
                    }
                );
                return ctx.badRequest("Too many failed attempts. OTP blocked for 5 minutes.");
            }

            // Verify OTP
            if (lastOtp.otp_number !== hashedOtp) {
                // Increment attempt count
                await strapi.entityService.update(
                    "api::otp-verification.otp-verification",
                    lastOtp.id,
                    { data: { attempt_count: currentAttempts } }
                );

                // Block after max attempts reached
                if (currentAttempts >= maxAttempts) {
                    await strapi.entityService.update(
                        "api::otp-verification.otp-verification",
                        lastOtp.id,
                        {
                            data: {
                                blockUntil: new Date(Date.now() + 5 * 60 * 1000)
                            }
                        }
                    );
                    return ctx.badRequest("Invalid OTP. Maximum attempts reached. Please try again after 5 minutes.");
                }

                const remainingAttempts = maxAttempts - currentAttempts;
                return ctx.badRequest(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
            }

            // OTP is valid - mark as verified
            await strapi.entityService.update(
                "api::otp-verification.otp-verification",
                lastOtp.id,
                { data: { is_verified: true } }
            );

            // Authenticate user and generate token
            const user = await authenticateUserAndSendToken({ email: email.toLowerCase().trim() });

            if (!user) {
                return ctx.badRequest("User authentication failed");
            }

            return ctx.send({
                message: "OTP verified successfully",
                data: user
            });

        } catch (error) {
            // Log detailed error for debugging
            console.error("Error verifying OTP:", {
                error: error.message,
                stack: error.stack,
                email: ctx.request.body?.email,
                timestamp: new Date().toISOString()
            });

            // Return generic error to client
            return ctx.internalServerError("Failed to verify OTP. Please try again.");
        }
    }
};
function getNextDelayMinutes(attemptNumber) {
    switch (attemptNumber) {
        case 3: return 5;
        case 4: return 10;
        case 5: return 20;
        case 6: return 40;
        default: return 80;
    }
}

async function authenticateUserAndSendToken({ email }) {
    const user = await strapi.query("plugin::users-permissions.user").findOne({
        where: { email },
        populate: ["user_activity_summary", "trainer_activity_summary"],
    });
    const earnedPoints = Number(user?.user_activity_summary?.points_earned) || 0;
    const trainerPoints = Number(user?.trainer_activity_summary?.points_achieved) || 0;

    const total_points = earnedPoints + trainerPoints;

    if (!user) {
        return ctx.unauthorized("User not found or invalid credentials.");
    }
    console.log("👤 Found User:", user.blocked);

    // ✅ Check if the user is blocked
    if (user.blocked) {
        return ctx.unauthorized("Your account is blocked. Please contact support.");
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    return { token, user, total_points }
}

async function sendOTPEmail({ user, otp }) {
    const sendingOtpTemplate = await strapi.db
        .query("api::message-template.message-template")
        .findOne({
            where: { email_type: "SEND_OTP" },
        });

    if (!sendingOtpTemplate) {
        console.error("Sending OTP email template not found");
        return;
    }

    const messageArray = sendingOtpTemplate.message || [];
    const rawMessage = messageArray
        .map((paragraph) =>
            paragraph.type === "paragraph"
                ? paragraph.children.map((child) => child.text || "").join("")
                : ""
        )
        .join("\n\n");

    const placeholders = {
        username: user.username,
        firstName: user.firstName,
        otp: otp,
        expiryMinutes: 10, // Assuming OTP is valid for 10 minutes
    };

    // @ts-ignore
    const processedMessage = _.template(rawMessage)(placeholders);
    // @ts-ignore
    const processedSubject = _.template(sendingOtpTemplate.subject)(
        placeholders
    );


    setImmediate(async () => {
        try {
            console.log("setting immediate things for the course recommend thing");

            await transporter.sendMail({
                from: process.env.EMAIL_ADDRESS,
                to: user.email,
                subject: processedSubject,
                html: processedMessage,
            });
        } catch (err) {
            console.error("Error sending recommendation email:", err);
        }
    });
}
