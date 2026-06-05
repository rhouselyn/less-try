"""历史记录相关路由：history/*"""

from fastapi import APIRouter, HTTPException

from utils.state import storage
from utils.helpers import filter_eligible_sentences

router = APIRouter(prefix="/api", tags=["history"])


def compute_file_progress(file_id: str) -> dict:
    try:
        result = {"phase1": {"completed": 0, "total": 0}, "phase2": {"completed": 0, "total": 0}}

        plan = storage.load_learning_plan(file_id)
        if plan:
            max_index = storage.load_learning_max_progress(file_id)
            accumulated = 0
            completed = 0
            for unit_plan in plan:
                items = unit_plan.get("items", [])
                end_index = accumulated + len(items)
                if max_index >= end_index:
                    completed += 1
                accumulated = end_index
            result["phase1"]["completed"] = completed
            result["phase1"]["total"] = len(plan)

        sentences = storage.load_pipeline_data(file_id)
        if sentences:
            eligible = filter_eligible_sentences(sentences)
            if eligible:
                exercise_order = storage.load_exercise_order(file_id, 2)
                exercises_per_sent = []
                for s in eligible:
                    wc = len(s.get("sentence", "").split())
                    if wc >= 20:
                        exercises_per_sent.append(3)
                    elif wc >= 3:
                        exercises_per_sent.append(4)
                    else:
                        exercises_per_sent.append(1)
                expected_length = sum(exercises_per_sent)

                if exercise_order and len(exercise_order) == expected_length:
                    total_exercises = len(exercise_order)
                    unit_size = 10
                    num_units = max(1, (total_exercises + unit_size - 1) // unit_size)
                    max_exercise_index = storage.load_phase2_max_progress(file_id)

                    completed = 0
                    for i in range(num_units):
                        end = min((i + 1) * unit_size, total_exercises)
                        if max_exercise_index >= end:
                            completed += 1
                    result["phase2"]["completed"] = completed
                    result["phase2"]["total"] = num_units

        return result
    except Exception:
        return {"phase1": {"completed": 0, "total": 0}, "phase2": {"completed": 0, "total": 0}}


@router.get("/history")
async def get_history():
    try:
        records = storage.load_history()
        records.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        for record in records:
            file_id = record.get("file_id", "")
            if file_id:
                record["progress"] = compute_file_progress(file_id)
            else:
                record["progress"] = {"phase1": {"completed": 0, "total": 0}, "phase2": {"completed": 0, "total": 0}}
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{file_id}")
async def delete_history(file_id: str):
    try:
        success = storage.delete_history_record(file_id)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/history/{file_id}")
async def rename_history(file_id: str, request: dict):
    try:
        new_title = request.get("title", "").strip()
        if not new_title:
            raise HTTPException(status_code=400, detail="Title is required")
        success = storage.rename_history_record(file_id, new_title)
        if success:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
