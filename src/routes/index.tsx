import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { toPng } from "html-to-image";
import { Search, Shield, Code, Download, ImagePlus, X, Moon, Sun } from "lucide-react";
// main.tsx 또는 App.tsx 상단
import "pretendard/dist/web/static/pretendard.css"; // <- 이 줄 추가
import "./style.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "방주 통행증 발급처" },
      {
        name: "description",
        content: "통행 증명서를 통하여 나의 신원을 보증하세요.",
      },
      { property: "og:title", content: "방주 통행증 메이커" },
      {
        property: "og:description",
        content: "통행 증명서를 통하여 나의 신원을 보증하세요.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// 항상 이 픽셀 크기를 기준으로 렌더링 — 폰트/간격 비율이 기기와 무관하게 항상 동일하도록 고정
const FRAME_SIZE = 640;

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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
  const [dark, setDark] = useState(false);

  const current = DEPARTMENTS.find((d) => d.id === dept)!;
  const accentColor = current.color;

  // 화면 폭에 맞춰 640px 고정 카드를 통째로 축소/확대 (비율 100% 유지)
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setScale(w / FRAME_SIZE);
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

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

  const cardRef = useRef<HTMLDivElement>(null); // 카드 자체를 가리키는 ref 추가

  async function download() {
    const el = captureRef.current;
    const card = cardRef.current;
    if (!el || !card || downloading) return;
    setDownloading(true);

    const prevTransform = el.style.transform;
    const prevShadow = card.style.boxShadow;
    el.style.transform = "none";
    card.style.boxShadow = "none"; // 사파리에서 그림자가 깨지는 문제 방지: 캡처 중엔 잠깐 제거

    try {
      // 1. 따옴표를 포함한 정석 문법으로 폰트 로드
      await Promise.all([
        document.fonts.load("400 16px 'Pretendard'"),
        document.fonts.load("500 16px 'Pretendard'"),
        document.fonts.load("700 16px 'Pretendard'"),
        document.fonts.load("800 16px 'Pretendard'"),
      ]);
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const dataUrl = await toPng(el, {
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        pixelRatio: 3,
        cacheBust: true,
        // 2. 외부 CDN WOFF2 파일 재요청 시 발생하는 CORS/네트워크 에러 방지
        fontEmbedCSS: "",
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
      el.style.transform = prevTransform;
      card.style.boxShadow = prevShadow;
      setDownloading(false);
    }
  }

  const cardStyle = cardImage
    ? {
        backgroundImage: `url(${cardImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: titleColor,
      }
    : { backgroundColor: cardColor, color: titleColor };

  const rectStyle = rectImage
    ? {
        backgroundImage: `url(${rectImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: rectColor };

  return (
    <main
      className={dark ? "min-h-screen bg-[#0b0b0c] px-4 py-8" : "min-h-screen bg-muted px-4 py-8"}
      style={{ fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="sr-only">방주 통행증 발급처</h1>

        {/* 화면 폭에 맞춰 스케일되는 정사각형 뷰포트 */}
        <div ref={wrapperRef} className="mx-auto aspect-square w-full max-w-xl overflow-hidden">
          {/* 항상 640x640 고정 픽셀로 렌더링되고, transform: scale()로만 화면에 맞춰 축소됨 */}
          <div
            ref={captureRef}
            style={{
              width: FRAME_SIZE,
              height: FRAME_SIZE,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              letterSpacing: "-0.02em",
              ...rectStyle,
            }}
            className="flex items-center justify-center p-10 transition-colors"
          >
            <div ref={cardRef} className="w-[95%] rounded-2xl p-6 shadow-2xl" style={cardStyle}>
              <p
                className="text-center text-[20px] font-extrabold tracking-tight"
                style={{ color: titleColor }}
              >
                CERTIFICATE OF TRANSIT AUTHORIZATION
              </p>

              <div className="mt-6 grid grid-cols-[1.3fr_0.7fr] items-center gap-6">
                <div className="text-right">
                  <p className="text-[16px]" style={{ color: labelColor }}>
                    NAME
                  </p>
                  <p
                    className="inline-block border-b-2 pb-1 text-[21px] font-medium leading-tight"
                    style={{ borderColor: nameColor, color: nameColor }}
                  >
                    {name || "\u00A0"}
                  </p>

                  <p className="mt-6 text-[16px]" style={{ color: labelColor }}>
                    DEPARTMENT
                  </p>
                  <div
                    className="flex items-center justify-end font-extrabold"
                    style={{ color: accentColor }}
                  >
                    <span className="text-[21px]">{current.label}</span>
                  </div>
                </div>

                <div
                  className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden"
                  style={{ backgroundColor: photoBg }}
                >
                  {photo && (
                    <img src={photo} alt="통행증 사진" className="size-full object-cover" />
                  )}
                </div>
              </div>

              <p className="mt-6 text-center text-[16px] font-bold" style={{ color: titleColor }}>
                상기인의 방주 통행 및 신원을 보증함.
              </p>
            </div>
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
