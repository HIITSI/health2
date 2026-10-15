"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement | null>(null),
    stop = useRef<(() => void) | null>(null),
    active = useRef(false),
    [message, setMessage] = useState(""),
    [scanning, setScanning] = useState(false);
  function end() {
    active.current = false;
    stop.current?.();
    stop.current = null;
    const stream = video.current?.srcObject;
    if (stream instanceof MediaStream)
      stream.getTracks().forEach((t) => t.stop());
    if (video.current) video.current.srcObject = null;
    setScanning(false);
  }
  useEffect(
    () => () => {
      active.current = false;
      stop.current?.();
      const stream = video.current?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function camera() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setMessage(
        "HTTPS와 카메라 지원 브라우저가 필요합니다. 번호를 입력하거나 바코드 사진을 선택하세요.",
      );
      return;
    }
    active.current = true;
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (!active.current || !video.current) return;
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video.current,
        (result) => {
          if (result && active.current) {
            const code = result.getText();
            end();
            onCode(code);
          }
        },
      );
      if (active.current) stop.current = () => controls.stop();
      else controls.stop();
    } catch {
      end();
      setMessage(
        "카메라를 열지 못했습니다. 권한·다른 앱 사용 여부를 확인하거나 번호로 검색하세요.",
      );
    }
  }
  return (
    <div className="mt-4 rounded-xl bg-[var(--muted)] p-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={scanning}
          onClick={() => void camera()}
        >
          카메라로 스캔
        </Button>
        {scanning && (
          <Button size="sm" variant="outline" type="button" onClick={end}>
            카메라 중지
          </Button>
        )}
      </div>
      <video
        ref={video}
        muted
        autoPlay
        playsInline
        className={
          scanning
            ? "mt-3 aspect-video w-full rounded-xl object-cover"
            : "hidden"
        }
      />
      <label className="mt-3" htmlFor="barcode-image">
        바코드 사진으로 읽기 (선택)
      </label>
      <input
        id="barcode-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          end();
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) {
            setMessage("5MB 이하 바코드 사진을 선택하세요.");
            return;
          }
          const url = URL.createObjectURL(f);
          try {
            const { BrowserMultiFormatReader } = await import("@zxing/browser");
            const result =
              await new BrowserMultiFormatReader().decodeFromImageUrl(url);
            onCode(result.getText());
            setMessage("바코드를 읽었습니다.");
          } catch {
            setMessage(
              "바코드를 읽지 못했습니다. 선명한 사진이나 번호 입력을 사용하세요.",
            );
          } finally {
            URL.revokeObjectURL(url);
          }
        }}
      />
      {message && (
        <p role="status" className="mt-3 text-xs subtle">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs subtle">
        카메라·바코드 사진은 기기에서 읽으며 영상 자체를 서버로 전송하지
        않습니다.
      </p>
    </div>
  );
}
