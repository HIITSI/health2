import { z } from "zod";
export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요.")
    .max(40, "이름은 40자 이내로 입력하세요."),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("ko-KR", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "올바른 IANA 시간대를 입력하세요."),
  weight_unit: z.enum(["kg", "lb"]),
  height_unit: z.enum(["cm", "in"]),
});
export type Profile = z.infer<typeof profileSchema>;
