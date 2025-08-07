from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import shutil
import openai
import os
import logging
import json
import re


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")


@app.post("/markdown-to-json")
async def markdown_to_json(request: Request):
    logger.info("=== Starting markdown-to-json request ===")
    try:
        data = await request.json()
        logger.info(f"Received request data keys: {list(data.keys())}")
        
        markdown = data.get("markdown", "")
        logger.info(f"Markdown length: {len(markdown)} characters")
        logger.info(f"Markdown preview (first 200 chars): {markdown[:200]}...")
        
        if not markdown:
            logger.error("No markdown provided in request")
            return {"error": "No markdown provided."}

        prompt = (
            "You are a helpful assistant. Below is a table extracted from a PDF file in plain text. "
            "Your job is to extract the table(s) into valid JSON with proper structure.\n\n"
            "Instructions:\n"
            "- Identify each table using its heading (e.g. 'TABLE 1. Patient demographics').\n"
            "- Use the first row of data as the column headers (e.g. 'SOA (n = 32)', 'TTA (n = 25)', 'p Value').\n"
            "- For each data row, create an object with the exact column header names as keys.\n"
            "- If a row acts as a group label (e.g. 'Presenting symptom, n (%)'), create a row with only a 'group' key.\n"
            "- Do NOT create duplicate columns or add extra keys like 'Value', 'Value_TTA', 'p_Value'.\n"
            "- Use the exact column names from the first row as keys.\n"
            "- Output a JSON object like { \"table_1\": [...], \"table_2\": [...] }.\n"
            "- Only return the JSON object, with no explanations or markdown formatting.\n\n"
            "Example structure:\n"
            "{\n"
            "  \"table_1\": [\n"
            "    {\"group\": \"Clinical description\"},\n"
            "    {\"SOA (n = 32)\": \"Age in yrs, mean ± SD\", \"TTA (n = 25)\": \"58.16 ± 16.16\", \"p Value\": \"0.87\"},\n"
            "    {\"group\": \"Presenting symptom, n (%)\"},\n"
            "    {\"SOA (n = 32)\": \"Incidental finding\", \"TTA (n = 25)\": \"6 (24)\", \"p Value\": \"0.73\"}\n"
            "  ]\n"
            "}\n\n"
            f"{markdown}"
        )
        
        logger.info(f"Prompt length: {len(prompt)} characters")
        logger.info("Calling OpenAI API...")

        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Only respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2048,
            temperature=0.2,
        )
        
        logger.info("OpenAI API call completed successfully")
        logger.info(f"OpenAI response keys: {list(response.keys())}")

        content = response["choices"][0]["message"]["content"]
        logger.info(f"OpenAI content length: {len(content)} characters")
        logger.info(f"OpenAI content preview: {content[:300]}...")
        
        cleaned_content = re.sub(r"^```(?:json)?|```$", "", content.strip(), flags=re.MULTILINE).strip()
        logger.info(f"Cleaned content length: {len(cleaned_content)} characters")
        logger.info(f"Cleaned content: {cleaned_content}")

        try:
            json_result = json.loads(cleaned_content)
            logger.info("Successfully parsed JSON from OpenAI response")
            logger.info(f"JSON result type: {type(json_result)}")
            if isinstance(json_result, dict):
                logger.info(f"JSON result keys: {list(json_result.keys())}")
        except Exception as json_error:
            logger.error(f"Failed to parse JSON: {json_error}")
            logger.info("Returning raw content as fallback")
            json_result = cleaned_content # For debugging if the LLM returns non-JSON

        logger.info("=== Returning response ===")
        return {"json": json_result}

    except Exception as e:
        logger.error(f"Exception in markdown_to_json: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Failed to extract JSON from markdown: {str(e)}"}