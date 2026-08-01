"use client"

/**
 * QuickPasteBox
 *
 * A textarea where the admin pastes a structured product text block
 * (matching the agreed format) and clicks "Apply" to auto-fill every
 * matching field in the form above it.
 *
 * Also includes a visible, copyable TEMPLATE so anyone (a teammate, or
 * an AI prompt) knows exactly what format is expected.
 *
 * Usage:
 *   <QuickPasteBox onApply={(parsed) => { ...merge into formData... }} />
 */

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, ChevronDown, ChevronUp, Copy, Check, FileText } from "lucide-react"
import { parseQuickPaste, ParsedProductData } from "@/lib/parseQuickPaste"

interface Props {
  onApply: (data: ParsedProductData) => void
}

const TEMPLATE = `Name: 
Slug: 
Price: 
Discount Price: 
Stock: 
SKU: 

Description:


Ingredients:


Benefits:


Usage:


Why You'll Love It:


Suitable For:


Fragrance Experience:


Who Is This For:


Skin Concern:


Expected Results:


Key Ingredients:
`

const FILLED_EXAMPLE = `Name: Lavender Glow Face Cream
Slug: lavender-glow-face-cream
Price: 299
Discount Price: 249
Stock: 50
SKU: NZ-FC-LAV-001

Description:
A luxurious face cream infused with pure lavender extract and hyaluronic acid that deeply moisturizes, soothes, and rejuvenates your skin overnight.

Ingredients:
Lavender Essential Oil
Hyaluronic Acid
Shea Butter
Aloe Vera Extract

Benefits:
Deeply moisturizes dry skin
Reduces redness and irritation
Improves skin texture overnight

Usage:
Apply a small amount to clean, dry face and neck. Use morning and night.

Why You'll Love It:
Deep 24-hour hydration for soft and supple skin
Calming lavender scent for a relaxing skincare ritual
Lightweight formula absorbs quickly without greasy residue

Suitable For:
Dry Skin
Sensitive Skin
Normal Skin

Fragrance Experience:
Floral
Calming
Lavender

Who Is This For:
Anyone with dry, sensitive, or dull skin looking for deep overnight hydration.

Skin Concern:
Dryness, skin roughness, redness, and loss of natural glow.

Expected Results:
Skin feels visibly softer and more hydrated within 3 days.

Key Ingredients:
Lavender Essential Oil — Calms inflammation and soothes sensitive skin
Hyaluronic Acid — Locks in moisture for 24-hour deep hydration
Shea Butter — Nourishes and repairs the skin barrier overnight`

const AI_PROMPT_TEMPLATE = `Write a product description for "<PRODUCT NAME>" using exactly this format. Keep each list item on its own line, no bullets or numbering. Use the "—" symbol to separate ingredient name from benefit in the Key Ingredients section.

Name: 
Slug: 
Price: 
Discount Price: 
Stock: 
SKU: 

Description:
(2-3 sentence intro paragraph)

Ingredients:
(one ingredient per line)

Benefits:
(one benefit per line)

Usage:
(short usage instructions paragraph)

Why You'll Love It:
(3-4 short selling points, one per line)

Suitable For:
(skin/hair types, one per line)

Fragrance Experience:
(2-3 single words describing the scent, one per line)

Who Is This For:
(1 sentence describing the ideal customer)

Skin Concern:
(1 sentence describing the problem this solves)

Expected Results:
(1-2 sentences on what results to expect and when)

Key Ingredients:
(Ingredient Name — what it does, one per line, 3-5 ingredients)`

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard API unavailable — silently ignore
    }
  }
  return (
    <Button type="button" onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </Button>
  )
}

export default function QuickPasteBox({ onApply }: Props) {
  const [text, setText] = useState("")
  const [expanded, setExpanded] = useState(true)
  const [showTemplate, setShowTemplate] = useState(false)
  const [templateTab, setTemplateTab] = useState<"blank" | "filled" | "prompt">("blank")
  const [status, setStatus] = useState<string>("")

  const handleApply = () => {
    if (!text.trim()) {
      setStatus("Paste some product text first.")
      return
    }
    const parsed = parseQuickPaste(text)
    const fieldsFound = Object.keys(parsed).length
    if (fieldsFound === 0) {
      setStatus("No recognizable fields found. Check the template below.")
      return
    }
    onApply(parsed)
    setStatus(`Filled ${fieldsFound} field${fieldsFound !== 1 ? "s" : ""} below. Review and edit as needed.`)
  }

  const handleClear = () => {
    setText("")
    setStatus("")
  }

  const handleUseTemplate = () => {
    setText(TEMPLATE)
    setShowTemplate(false)
    setStatus("")
  }

  return (
    <div className="border-2 border-dashed rounded-xl overflow-hidden" style={{ borderColor: "#9cc2a3" }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#f0f7f0" }}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4" style={{ color: "#1e3a28" }} />
          <span className="text-sm font-semibold" style={{ color: "#1e3a28" }}>
            Quick Paste — fill the whole form at once
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3 bg-background">
          <p className="text-xs text-muted-foreground">
            Paste your product write-up below using the labeled format (Name, Price, Description,
            Why You'll Love It, Key Ingredients, etc.) — one label per line, list items one per line.
            Click Apply to auto-fill the fields in the form below. You can still review and edit
            everything before saving.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowTemplate((s) => !s)}
            >
              <FileText className="w-3.5 h-3.5" />
              {showTemplate ? "Hide Template" : "View Template"}
            </Button>
          </div>

          {showTemplate && (
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-border bg-muted/40">
                {[
                  { key: "blank", label: "Blank Template" },
                  { key: "filled", label: "Filled Example" },
                  { key: "prompt", label: "AI Prompt" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTemplateTab(tab.key as typeof templateTab)}
                    className="px-3 py-2 text-xs font-medium border-b-2 transition-colors"
                    style={{
                      borderBottomColor: templateTab === tab.key ? "#1e3a28" : "transparent",
                      color: templateTab === tab.key ? "#1e3a28" : "#6b7c70",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-2 bg-background">
                {templateTab === "blank" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Empty labeled structure — fill in each field yourself, then paste below.
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-md p-3 max-h-64 overflow-y-auto">
                      {TEMPLATE}
                    </pre>
                    <div className="flex gap-2">
                      <CopyButton text={TEMPLATE} label="Copy Template" />
                      <Button type="button" size="sm" onClick={handleUseTemplate}>
                        Use This in Box Below
                      </Button>
                    </div>
                  </>
                )}

                {templateTab === "filled" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      A complete worked example, so you can see exactly how each section should look.
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-md p-3 max-h-64 overflow-y-auto">
                      {FILLED_EXAMPLE}
                    </pre>
                    <div className="flex gap-2">
                      <CopyButton text={FILLED_EXAMPLE} label="Copy Example" />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setText(FILLED_EXAMPLE)
                          setShowTemplate(false)
                          setStatus("")
                        }}
                      >
                        Use This in Box Below
                      </Button>
                    </div>
                  </>
                )}

                {templateTab === "prompt" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Copy this prompt into ChatGPT, Claude, or any AI tool — swap in your product name,
                      and it'll generate text in the exact format this box expects.
                    </p>
                    <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-md p-3 max-h-64 overflow-y-auto">
                      {AI_PROMPT_TEMPLATE}
                    </pre>
                    <CopyButton text={AI_PROMPT_TEMPLATE} label="Copy Prompt" />
                  </>
                )}
              </div>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste your product write-up here, or click \"View Template\" above to get started..."}
            rows={10}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm font-mono"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" onClick={handleApply} size="sm">
              Apply to Form
            </Button>
            <Button type="button" onClick={handleClear} variant="outline" size="sm">
              Clear
            </Button>
            {status && (
              <span className="text-xs" style={{ color: status.includes("No recognizable") ? "#b45309" : "#1e6636" }}>
                {status}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}