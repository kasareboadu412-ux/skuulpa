import { NextRequest, NextResponse } from "next/server";
import { requireStaffModule } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * POST /api/academics/scores/upload
 *
 * Accepts a multipart/form-data body with:
 *   - image: File  (photo of the handwritten score sheet)
 *   - roster: JSON string — [{ id, first_name, last_name, admission_number }]
 *   - max_score: number
 *   - assessment_name: string
 *
 * Sends the image to Gemini Vision, returns extracted scores keyed by student_id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaffModule("academics");
  if (auth instanceof NextResponse) return auth;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI score scanning is not configured. Add GEMINI_API_KEY to enable it." },
      { status: 501 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("image") as File | null;
    const rosterRaw = form.get("roster") as string | null;
    const maxScore = Number(form.get("max_score") ?? 100);
    const assessmentName = String(form.get("assessment_name") ?? "assessment");

    if (!file) return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    if (!rosterRaw) return NextResponse.json({ error: "Roster is required" }, { status: 400 });

    const roster = JSON.parse(rosterRaw) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      admission_number: string | null;
    }>;

    if (roster.length === 0) {
      return NextResponse.json({ error: "Roster is empty" }, { status: 400 });
    }

    // Convert uploaded file to base64 for Gemini.
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Build a roster reference so Gemini can match names/admission numbers.
    const rosterText = roster
      .map((s) => `${s.admission_number ?? "—"} | ${s.first_name} ${s.last_name}`)
      .join("\n");

    const prompt = `You are extracting student scores from a handwritten school score sheet photo.

Assessment: "${assessmentName}" (max score: ${maxScore})

Known students in this class (Admission No | Name):
${rosterText}

From the image, extract every student's score. Match each row to the known students above by admission number or name similarity.

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "scores": [
    { "student_id": "<id from roster>", "score": <number or null if blank/absent>, "matched_name": "<name you read from image>" }
  ]
}

Rules:
- Only include students you can actually see in the image.
- If a score cell is blank or illegible, set score to null.
- Match to one of these exact student_ids: ${roster.map((s) => s.id).join(", ")}
- Do not invent student_ids. Skip rows you cannot match.
- Scores must be between 0 and ${maxScore}. If a value exceeds ${maxScore}, set it to null.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,    // low — we want precise extraction
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: "AI service error. Please try again or enter scores manually." }, { status: 502 });
    }

    const geminiJson = await geminiRes.json();
    const rawText: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown fences if Gemini added them despite instructions.
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: { scores: Array<{ student_id: string; score: number | null; matched_name: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Gemini non-JSON response:", rawText);
      return NextResponse.json(
        { error: "Could not read the image. Make sure the photo is clear and well-lit, then try again." },
        { status: 422 }
      );
    }

    // Validate — only return scores for students actually in the roster.
    const validIds = new Set(roster.map((s) => s.id));
    const scores = (parsed.scores ?? [])
      .filter((s) => validIds.has(s.student_id))
      .map((s) => ({
        student_id: s.student_id,
        score: s.score !== null && !isNaN(Number(s.score)) ? Number(s.score) : null,
        matched_name: s.matched_name ?? "",
      }));

    return NextResponse.json({ scores, total_detected: scores.length });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
