// app/blog/loading.tsx
//
// Shown while /blog's server render streams in during client-side navigation.
// Mirrors the page (header, search, tag pills, card grid) so nothing jumps when
// the real content arrives. app/blog/[slug]/loading.tsx covers posts.

const PULSE = "animate-pulse rounded"
const FILL = { background: "#e8f2e4" }

export default function Loading() {
  return (
    <main className="min-h-screen" style={{ background: "#f4f9f4" }}>
      <section className="border-b" style={{ background: "#fff", borderColor: "#d4e8d0" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center">
          <div className={`${PULSE} rounded-full h-7 w-36 mb-4`} style={{ background: "#e8f4ec" }} />
          <div className={`${PULSE} h-10 md:h-12 w-64 mb-4`} style={FILL} />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-5">
        <div
          className={`${PULSE} rounded-xl max-w-md mx-auto mb-6 h-[46px]`}
          style={{ background: "#fff", border: "1px solid #d4e8d0" }}
        />
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${PULSE} rounded-full h-8 w-20`} style={{ background: "#fff", border: "1px solid #d4e8d0" }} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid #eaf0ea" }}>
              <div className="h-48 animate-pulse" style={FILL} />
              <div className="p-5">
                <div className={`${PULSE} h-3 w-20 mb-3`} style={FILL} />
                <div className={`${PULSE} h-5 w-4/5 mb-3`} style={FILL} />
                <div className={`${PULSE} h-4 w-full mb-2`} style={FILL} />
                <div className={`${PULSE} h-4 w-2/3 mb-4`} style={FILL} />
                <div className="flex justify-between pt-3" style={{ borderTop: "1px solid #f0f4f0" }}>
                  <div className={`${PULSE} h-3 w-24`} style={FILL} />
                  <div className={`${PULSE} h-3 w-16`} style={FILL} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
