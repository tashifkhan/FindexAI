from fastapi import APIRouter, HTTPException


router = APIRouter()


@router.get("/", status_code=200)
async def health_check():
    """
    Health check endpoint to verify the service is running.
    Returns a simple message indicating the service is healthy.
    """
    try:
        return {
            "status": "healthy",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}",
        )
