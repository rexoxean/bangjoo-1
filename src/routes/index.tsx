import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { Search, Shield, Code, Download, ImagePlus, X, Moon, Sun } from "lucide-react";

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

// 부서별 CMYK 색상 (안전팀=C, 수색팀=M, 개발팀=Y)
const DEPARTMENTS = [
  { id: "safety", label: "안전팀", Icon: Shield, color: "#00AEEF" }, // Cyan
  { id: "search", label: "수색팀", Icon: Search, color: "#EC008C" }, // Magenta
  { id: "dev", label: "개발팀", Icon: Code, color: "#FFF200" }, // Yellow
] as const;

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function normalizeHex(raw: string): string | null {
  let v = raw.trim();
  if (!v.startsWith("#")) v = `#${v}`;
  if (!HEX_RE.test(v)) return null;
  if (v.length === 4) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v;
}

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

  const [titleColor, setTitleColor] = useState("#111111");
  const [labelColor, setLabelColor] = useState("#6b7280");
  const [nameColor, setNameColor] = useState("#111111");

  const [cardColor, setCardColor] = useState("#ffffff");
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [rectColor, setRectColor] = useState("#8f8f8f");
  const [rectImage, setRectImage] = useState<string | null>(null);
  const [photoBg, setPhotoBg] = useState("#4b5563");
  const [downloading, setDownloading] = useState(false);

  // 사이트 전체(편집 도구 화면) 다크/아포칼립스 테마 — 카드 자체 색상과는 별개
  const [dark, setDark] = useState(false);

  const current = DEPARTMENTS.find((d) => d.id === dept)!;
  const accentColor = current.color;

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
        skipFonts: false,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "transit-certificate.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error("이미지 생성 실패:", err);
      alert("이미지 생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  }

  const cardStyle = cardImage
    ? {
        backgroundImage: `url(${cardImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: titleColor,
        containerType: "inline-size" as const,
      }
    : {
        backgroundColor: cardColor,
        color: titleColor,
        containerType: "inline-size" as const,
      };

  const rectStyle = rectImage
    ? {
        backgroundImage: `url(${rectImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: rectColor };

  const SPACING = "clamp(10px,4cqw,32px)";

  return (
    <main
      className={dark ? "min-h-screen bg-[#0b0b0c] px-4 py-8" : "min-h-screen bg-muted px-4 py-8"}
      style={{ fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="sr-only">방주 통행 증명서 메이커</h1>

        <div
          ref={captureRef}
          className="mx-auto flex aspect-square w-full max-w-xl items-center justify-center p-6 transition-colors sm:p-10"
          style={{ ...rectStyle, letterSpacing: "-0.02em" }}
        >
          <div
            className="aspect-[3/2] w-[90%] overflow-hidden rounded-lg p-[clamp(10px,4cqw,32px)] shadow-2xl"
            style={cardStyle}
          >
            <p
              className="text-center font-extrabold tracking-tight text-[clamp(10px,3cqw,22px)]"
              style={{ color: titleColor }}
            >
              CERTIFICATE OF TRANSIT AUTHORIZATION
            </p>

            <div
              className="grid grid-cols-[1.3fr_0.7fr] items-center"
              style={{ marginTop: SPACING, gap: SPACING }}
            >
              <div className="text-right">
                <p className="text-[clamp(9px,2.1cqw,17px)]" style={{ color: labelColor }}>
                  NAME
                </p>
                <p
                  className="inline-block border-b-2 pb-1 font-medium leading-tight text-[clamp(11px,3cqw,23px)]"
                  style={{ borderColor: nameColor, color: nameColor }}
                >
                  {name || "\u00A0"}
                </p>

                <p
                  className="text-[clamp(9px,2.1cqw,17px)]"
                  style={{ color: labelColor, marginTop: SPACING }}
                >
                  DEPARTMENT
                </p>
                <div
                  className="flex items-center justify-end font-extrabold"
                  style={{ color: accentColor }}
                >
                  <span className="text-[clamp(12px,3cqw,23px)]">{current.label}</span>
                </div>
              </div>

              <div
                className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden"
                style={{ backgroundColor: photoBg }}
              >
                {photo && <img src={photo} alt="통행증 사진" className="size-full object-cover" />}
              </div>
            </div>

            <p
              className="text-center font-bold text-[clamp(10px,2.3cqw,18px)]"
              style={{ color: titleColor, marginTop: SPACING }}
            >
              상기인의 방주 통행 및 신원을 보증함.
            </p>
          </div>
        </div>

        {/* Tools */}
        <section
          className={
            dark
              ? "rounded-2xl border border-[#3a1f14] bg-[#17140f] p-5 text-[#e8dfce] shadow-lg"
              : "rounded-2xl bg-card p-5 text-card-foreground shadow-lg"
          }
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">통행증 편집</h2>
            <button
              type="button"
              onClick={() => setDark((v) => !v)}
              className={
                dark
                  ? "flex items-center gap-1.5 rounded-lg border border-[#5a3220] bg-[#241c14] px-3 py-1.5 text-xs font-medium text-[#e8dfce] hover:bg-[#2c2116]"
                  : "flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
              }
            >
              {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {dark ? "라이트 모드" : "다크 모드"}
            </button>
          </div>

          <label className="block text-sm font-medium">NAME</label>
          <NameFieldWithHex
            value={name}
            onChange={setName}
            color={nameColor}
            onColorChange={setNameColor}
          />

          <label className="mt-4 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm font-medium hover:bg-accent">
            <ImagePlus className="size-4" />
            사진 넣기
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </label>

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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <HexColorField label="제목·하단 문구" value={titleColor} onChange={setTitleColor} />
            <HexColorField label="라벨 (NAME/DEPT)" value={labelColor} onChange={setLabelColor} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ImageOrColorField
              label="카드"
              color={cardColor}
              onColorChange={setCardColor}
              image={cardImage}
              onImageChange={onCardImage}
              onClearImage={() => setCardImage(null)}
            />
            <ImageOrColorField
              label="배경"
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
            {downloading ? "통행증을 발급 중입니다..." : "통행증 발급하기"}
          </button>
        </section>
      </div>
    </main>
  );
}

/** 이름 텍스트 입력 + 색상 피커 + 헥스코드 입력 */
function NameFieldWithHex({
  value,
  onChange,
  color,
  onColorChange,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
}) {
  const [hexText, setHexText] = useState(color);

  useEffect(() => {
    setHexText(color);
  }, [color]);

  function commit(raw: string) {
    const normalized = normalizeHex(raw);
    if (normalized) {
      onColorChange(normalized);
    } else {
      setHexText(color);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="이름을 입력하세요"
        className="h-10 min-w-[140px] flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="color"
        value={color}
        onChange={(e) => onColorChange(e.target.value)}
        className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-background"
        aria-label="이름 글자 색"
      />
      <input
        type="text"
        value={hexText}
        onChange={(e) => setHexText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="#000000"
        className="h-10 w-24 shrink-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

/** 색상 피커 + 헥스코드 입력 */
function HexColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  function commit(raw: string) {
    const normalized = normalizeHex(raw);
    if (normalized) {
      onChange(normalized);
    } else {
      setText(value);
    }
  }

  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-background"
          aria-label={`${label} 색상 선택`}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="#000000"
          className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
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
  const [text, setText] = useState(color);

  useEffect(() => {
    setText(color);
  }, [color]);

  function commit(raw: string) {
    const normalized = normalizeHex(raw);
    if (normalized) {
      onColorChange(normalized);
    } else {
      setText(color);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs font-medium">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-background"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="#000000"
          className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background hover:bg-accent">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-accent"
            aria-label="이미지 제거"
          >
            <X className="size-4 opacity-60" />
          </button>
        )}
      </div>
    </div>
  );
}
