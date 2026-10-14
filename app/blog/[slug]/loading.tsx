// app/blog/[slug]/loading.tsx
//
// Shown while a post's server render streams in during client-side navigation.
// Mirrors the article layout (back link, meta row, title, tags/share, image, body).

const PULSE = "animate-pulse rounded"
const FILL = { background: "#e8f2e4" }

export default function Loading() {
  return (
    <main className="min-h-screen" style={{ background: "#f4f9f4" }}>
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <div className={`${PULSE} h-5 w-32 mb-8`} style={FILL} />

        <div className="flex items-center gap-4 mb-5">
          <div className={`${PULSE} h-3 w-24`} style={FILL} />
          <div className={`${PULSE} h-3 w-28`} style={FILL} />
          <div className={`${PULSE} rounded-full h-5 w-20`} style={{ background: "#e8f4ec" }} />
        </div>

        <div className={`${PULSE} h-9 md:h-12 w-full mb-3`} style={FILL} />
        <div className={`${PULSE} h-9 md:h-12 w-2/3 mb-6`} style={FILL} />

        <div className="flex items-center justify-between gap-3 mb-8 pb-8" style={{ borderBottom: "1px solid #d4e8d0" }}>
          <div className="flex gap-2">
            <div className={`${PULSE} rounded-full h-7 w-16`} style={FILL} />
            <div className={`${PULSE} rounded-full h-7 w-20`} style={FILL} />
          </div>
          <div className={`${PULSE} rounded-full h-8 w-20`} style={FILL} />
        </div>

        <div className="w-full aspect-video rounded-2xl mb-10 animate-pulse" style={FILL} />

        <div className="space-y-3">
          {["w-full", "w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((width, i) => (
            <div key={i} className={`${PULSE} h-4 ${width}`} style={FILL} />
          ))}
        </div>
      </div>
    </main>
  )
}
