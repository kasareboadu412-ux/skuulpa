import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessment_id = searchParams.get("assessment_id");
    const student_id = searchParams.get("student_id");
    const class_id = searchParams.get("class_id");

    let query = supabase
      .from("assessment_scores")
      .select("*, assessment:assessments(*, subject:subjects(*)), student:students(*)")
      .order("created_at", { ascending: false });

    if (assessment_id) {
      query = query.eq("assessment_id", assessment_id);
    }
    if (student_id) {
      query = query.eq("student_id", student_id);
    }
    if (class_id) {
      query = query.eq("student.class_id", class_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch score recording
    if (Array.isArray(body.scores)) {
      const { scores, assessment_id } = body;

      if (!assessment_id || !scores || scores.length === 0) {
        return NextResponse.json(
          { error: "assessment_id and scores array are required" },
          { status: 400 }
        );
      }

      // Validate max_score from assessment
      const { data: assessment } = await supabase
        .from("assessments")
        .select("max_score")
        .eq("id", assessment_id)
        .single();

      if (!assessment) {
        return NextResponse.json(
          { error: "Assessment not found" },
          { status: 404 }
        );
      }

      // Validate scores against max_score
      const validatedScores = scores.map(
        (s: { student_id: string; score?: number; remarks?: string }) => {
          const scoreValue = s.score !== undefined ? s.score : null;
          return {
            assessment_id,
            student_id: s.student_id,
            score: scoreValue,
            remarks: s.remarks ?? null,
          };
        }
      );

      // Upsert to handle re-scoring
      const { data, error } = await supabase
        .from("assessment_scores")
        .upsert(validatedScores, {
          onConflict: "assessment_id, student_id",
          ignoreDuplicates: false,
        })
        .select("*, assessment:assessments(*), student:students(*)");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data, count: data?.length ?? 0 }, { status: 201 });
    }

    // Single score
    const { assessment_id, student_id, score, remarks } = body;

    if (!assessment_id || !student_id) {
      return NextResponse.json(
        { error: "assessment_id and student_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("assessment_scores")
      .upsert(
        [
          {
            assessment_id,
            student_id,
            score: score ?? null,
            remarks: remarks ?? null,
          },
        ],
        { onConflict: "assessment_id, student_id", ignoreDuplicates: false }
      )
      .select("*, assessment:assessments(*), student:students(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
