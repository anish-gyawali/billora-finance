import { z } from "zod";

const password = z.string().min(10, "Password must be at least 10 characters").max(128, "Password must not exceed 128 characters");

export const changePasswordSchema = z
  .object({
    temporaryPassword: z.string().min(1, "Temporary password is required").max(128),
    newPassword: password,
    confirmNewPassword: z.string().min(1, "New password confirmation is required").max(128),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

export const resetPasswordSchema = z
  .object({
    password,
    passwordConfirm: z.string().min(1, "Password confirmation is required").max(128),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
