import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { Search, Shield, Code, Download, ImagePlus, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "방주 통행증 메이커 | 이름·사진·색상 커스텀 카드" },
      {
        name: "description",
        content:
          "사진과 이름을 넣고 글씨색·카드색·배경색을 바꿔 나만의 통행 증명서를 만들고 이미지로 저장하세요.",
      },
      { property: "og:title", content: "방주 통행증 메이커" },
      {
        property: "og:description",
        content: "사진, 이름, 색상을 커스텀해 통행 증명서를 만들고 갤러리에 저장하세요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// 부서별 CMYK 색상 지정 (안전팀=C, 수색팀=M, 개발팀=Y)
const DEPARTMENTS = [
  { id: "safety", label: "안전팀", Icon: Shield, color: "#00AEEF" }, // Cyan
  { id: "search", label: "수색팀", Icon: Search, color: "#EC008C" }, // Magenta
  { id: "dev", label: "개발팀", Icon: Code, color: "#FFF200" }, // Yellow
] as const;

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function Index() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [dept, setDept] = useState<(typeof DEPARTMENTS)[number]["id"]>("search");
  const [textColor, setTextColor] = useState("#111111");
  const [cardColor, setCardColor] = useState("#ffffff");
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [rectColor, setRectColor] = useState("#8f8f8f");
  const [rectImage, setRectImage] = useState<string | null>(null);
  const [photoBg, setPhotoBg] = useState("#4b5563");
  const [downloading, setDownloading] = useState(false);

  const current = DEPARTMENTS.find((d) => d.id === dept)!;
  const DeptIcon = current.Icon;
  const accentColor = current.color; // 부서 선택에 따라 자동 결정

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(await readImageFile(file));
  }

  async function onCardImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCardImage(await readImageFile(file));
  }

  async function onRectImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRectImage(await readImageFile(file));
  }

  async function download() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        skipFonts: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "transit-certificate.png", { type: "image/png" });

      // 모바일(특히 iOS Safari)은 <a download>를 무시하는 경우가 많아서
      // Web Share API가 되면 공유 시트(사진 앱 저장 포함)로 우선 처리
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "방주 통행증" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "transit-certificate.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      // 공유 시트를 사용자가 취소한 경우는 에러로 취급하지 않음
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("이미지 다운로드 실패:", err);
      alert("이미지 다운로드에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  }

  const cardStyle = cardImage
    ? {
        backgroundImage: `url(${cardImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: textColor,
      }
    : { backgroundColor: cardColor, color: textColor };

  const rectStyle = rectImage
    ? {
        backgroundImage: `url(${rectImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: rectColor };

  return (
    <main className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="sr-only">방주 통행 증명서 메이커</h1>

        <div
          ref={captureRef}
          className="mx-auto flex aspect-square w-full max-w-xl items-center justify-center p-6 transition-colors sm:p-10"
          style={rectStyle}
        >
          <div className="aspect-[2/1] w-[85%] overflow-hidden p-4 shadow-2xl sm:p-8" style={cardStyle}>
            <p className="text-center text-base font-extrabold tracking-tight sm:text-2xl">
              CERTIFICATE OF TRANSIT AUTHORIZATION
            </p>
            
            <div className="mt-4 grid grid-cols-[1.3fr_1fr] items-center gap-3 sm:gap-6">
              <div className="text-right">
                <p className="text-xs sm:text-lg">NAME</p>
                <p
                  className="inline-block border-b-2 pb-1 text-sm font-medium leading-tight sm:text-xl"
                  style={{ borderColor: textColor }}
                >
                  {name || "\u00A0"}
                </p>
            
                <p className="mt-4 text-xs sm:text-lg">DEPARTMENT</p>
                <div className="flex items-center justify-end gap-2 font-extrabold" style={{ color: accentColor }}>
                  <DeptIcon className="size-5 sm:size-7" strokeWidth={2.5} />
                  <span className="text-base sm:text-xl">{current.label}</span>
                </div>
              </div>
            
              <div
                className="flex aspect-square w-full items-center justify-center overflow-hidden"
                style={{ backgroundColor: photoBg }}
              >
                {photo && <img src={photo} alt="통행증 사진" className="size-full object-cover" />}
              </div>
            </div>
            
            <p className="mt-4 text-center text-xs font-bold sm:text-lg">
              상기인의 방주 통행 및 신원을 보증함.
            </p>
          </div>
        </div>

        <section className="rounded-2xl bg-card p-5 text-card-foreground shadow-lg">
          <h2 className="mb-4 text-base font-semibold">편집 도구</h2>

          <label className="block text-sm font-medium">NAME</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm font-medium hover:bg-accent">
              <ImagePlus className="size-4" />
              사진 넣기
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            <ColorField label="사진 배경" value={photoBg} onChange={setPhotoBg} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {DEPARTMENTS.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => setDept(id)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                  dept === id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <Icon className="size-5" style={dept === id ? undefined : { color }} />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ColorField label="글씨 색" value={textColor} onChange={setTextColor} />
            <ImageOrColorField
              label="카드 배경"
              color={cardColor}
              onColorChange={setCardColor}
              image={cardImage}
              onImageChange={onCardImage}
              onClearImage={() => setCardImage(null)}
            />
            <ImageOrColorField
              label="카드 뒤 배경"
              color={rectColor}
              onColorChange={setRectColor}
              image={rectImage}
              onImageChange={onRectImage}
              onClearImage={() => setRectImage(null)}
            />
          </div>

          <button
            onClick={download}
            disabled={downloading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Download className="size-4" />
            {downloading ? "이미지 생성 중..." : "이미지 다운로드"}
          </button>
        </section>
      </div>
    </main>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background"
      />
    </label>
  );
}

function ImageOrColorField({
  label,
  color,
  onColorChange,
  image,
  onImageChange,
  onClearImage,
}: {
  label: string;
  color: string;
  onColorChange: (v: string) => void;
  image: string | null;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs font-medium">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-10 flex-1 cursor-pointer rounded-lg border border-border bg-background"
        />
        <label className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background hover:bg-accent">
          {image ? (
            <img src={image} alt="" className="size-full rounded-lg object-cover" />
          ) : (
            <ImagePlus className="size-4 opacity-60" />
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
        </label>
        {image && (
          <button
            type="button"
            onClick={onClearImage}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-accent"
            aria-label="이미지 제거"
          >
            <X className="size-4 opacity-60" />
          </button>
        )}
      </div>
    </div>
  );
}
