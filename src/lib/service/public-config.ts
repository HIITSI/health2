export function publicSignup() {
  const https = (value: string | undefined) => {
    try {
      return new URL(value || "").protocol === "https:";
    } catch {
      return false;
    }
  };
  return Boolean(
    process.env.FITLOG_PUBLIC_SIGNUP === "true" &&
    https(process.env.FITLOG_TERMS_URL) &&
    https(process.env.FITLOG_PRIVACY_URL),
  );
}
