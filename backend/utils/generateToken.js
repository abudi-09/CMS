import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    //
    expiresIn: "15d",
  });
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "development", // Use secure cookies in production
    sameSite: "strict", // Helps prevent CSRF attacks
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
  });
};
