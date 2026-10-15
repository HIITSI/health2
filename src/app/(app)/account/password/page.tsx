import { configured } from "@/lib/config";
import { PasswordForm } from "@/components/password-form";
export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-bold">비밀번호 설정</h1>
      <p className="mt-3 subtle">
        초대 계정의 비밀번호를 설정하거나 기존 비밀번호를 변경하세요.
      </p>
      <PasswordForm enabled={configured} />
    </>
  );
}
