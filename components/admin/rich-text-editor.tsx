// components/admin/rich-text-editor.tsx
"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, RemoveFormatting, Quote, Code2,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

/* ─── HTML sanitizer ─────────────────────────────────────────
   Pasted content (from Word, Google Docs, other websites, etc.)
   often carries inline styles, class names, <span>/<div> wrappers,
   and tracking junk. This strips all of that down to a small,
   predictable set of tags so saved content stays clean and safe
   to render on the public blog. ────────────────────────────── */

const ALLOWED_TAGS = new Set([
  "P", "H2", "H3", "H4", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "A", "BR", "BLOCKQUOTE",
])

function cleanNode(node: Node): Node | DocumentFragment | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode()
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const el = node as HTMLElement
  const tag = el.tagName

  const cleanedChildren = Array.from(el.childNodes)
    .map(cleanNode)
    .filter((n): n is Node => n !== null)

  // Word/Docs/websites wrap everything in <div>, <span>, <font>, etc.
  // Unwrap those — keep their (already-cleaned) children, drop the wrapper.
  if (!ALLOWED_TAGS.has(tag)) {
    const frag = document.createDocumentFragment()
    cleanedChildren.forEach((c) => frag.appendChild(c))
    return frag
  }

  const newEl = document.createElement(tag)
  if (tag === "A") {
    const href = el.getAttribute("href")
    if (href) newEl.setAttribute("href", href)
    newEl.setAttribute("target", "_blank")
    newEl.setAttribute("rel", "noopener noreferrer")
  }
  cleanedChildren.forEach((c) => newEl.appendChild(c))
  return newEl
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const wrapper = document.createElement("div")
  Array.from(doc.body.childNodes).forEach((n) => {
    const cleaned = cleanNode(n)
    if (cleaned) wrapper.appendChild(cleaned)
  })
  return wrapper.innerHTML
}

// Plain-text paste (no HTML on the clipboard) — turn blank-line-separated
// blocks into paragraphs so it isn't dumped in as one wall of text.
function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/* ─── Component ──────────────────────────────────────────── */

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = useState(!value)
  const [showHtml, setShowHtml] = useState(false)

  // Sync external value changes (e.g. loading existing blog data) into the DOM.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ""
      setIsEmpty(!(value && value.replace(/<[^>]+>/g, "").trim()))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emitChange = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setIsEmpty(editorRef.current.textContent?.trim().length === 0)
    onChange(html)
  }, [onChange])

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    emitChange()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const html = e.clipboardData.getData("text/html")
    const text = e.clipboardData.getData("text/plain")
    const cleanedHtml = html ? sanitizeHtml(html) : plainTextToHtml(text)
    document.execCommand("insertHTML", false, cleanedHtml)
    emitChange()
  }

  const handleLink = () => {
    const url = window.prompt("Link URL (e.g. https://example.com)")
    if (!url) return
    exec("createLink", url)
  }

  const toolbarBtn =
    "flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
  const toolbarBtnActive = "bg-emerald-50 text-emerald-700"

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-700/20 focus-within:border-emerald-700 bg-white">

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/60 flex-wrap">
        <button type="button" onClick={() => exec("bold")} className={toolbarBtn} title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec("italic")} className={toolbarBtn} title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" onClick={() => exec("formatBlock", "h2")} className={toolbarBtn} title="Heading">
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "h3")} className={toolbarBtn} title="Subheading">
          <Heading3 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "blockquote")} className={toolbarBtn} title="Quote">
          <Quote className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" onClick={() => exec("insertUnorderedList")} className={toolbarBtn} title="Bullet list">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={toolbarBtn} title="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" onClick={handleLink} className={toolbarBtn} title="Insert link">
          <Link2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec("removeFormat")} className={toolbarBtn} title="Clear formatting">
          <RemoveFormatting className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowHtml((s) => !s)}
          className={`${toolbarBtn} ${showHtml ? toolbarBtnActive : ""}`}
          title="View HTML source"
        >
          <Code2 className="w-4 h-4" />
        </button>
      </div>

      {/* Editable area */}
      {showHtml ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full px-4 py-3.5 text-xs font-mono text-gray-700 focus:outline-none resize-y"
        />
      ) : (
        <div className="relative">
          {isEmpty && placeholder && (
            <p className="absolute top-3.5 left-4 text-sm text-gray-400 pointer-events-none">{placeholder}</p>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={emitChange}
            onPaste={handlePaste}
            onBlur={emitChange}
            className="prose prose-sm max-w-none min-h-[260px] px-4 py-3.5 text-sm text-gray-900 leading-relaxed focus:outline-none
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-4 [&_h2]:mb-1.5
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-3 [&_h3]:mb-1
              [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5
              [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-200 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic
              [&_a]:text-emerald-700 [&_a]:underline"
          />
        </div>
      )}

      {/* Helper text */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60">
        <p className="text-[11px] text-gray-400">
          {showHtml
            ? "Editing raw HTML — switch back to the formatted view when you're done."
            : "Paste directly from Word, Google Docs, or a website — formatting like headings, bold text, and lists carries over automatically."}
        </p>
      </div>
    </div>
  )
}