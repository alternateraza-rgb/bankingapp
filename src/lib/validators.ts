import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passcodeSchema = z
  .object({
    passcode: z.string().regex(/^\d{6}$/, "Enter a 6-digit passcode"),
    confirm: z.string(),
  })
  .refine((data) => data.passcode === data.confirm, {
    message: "Passcodes do not match",
    path: ["confirm"],
  });

export const recipientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["personal", "business"]),
  email: z.string().email().optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  currency: z.enum(["USD", "EUR", "GBP", "PKR", "CNY", "PHP", "AED", "AUD", "CAD"]),
  accountLast4: z.string().regex(/^\d{4}$/, "Enter last 4 digits"),
  bankName: z.string().min(2, "Bank name is required"),
});

export const amountSchema = z.object({
  amount: z.number().positive("Enter an amount greater than 0"),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type PasscodeValues = z.infer<typeof passcodeSchema>;
export type RecipientValues = z.infer<typeof recipientSchema>;
