from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import shutil
import openai
import os
import logging
import json
import re
import boto3
from datetime import datetime
from supabase import create_client, Client


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when using "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")
# AWS S3 Configuration
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY "),
    region_name=os.getenv("AWS_REGION")
)
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Supabase Configuration
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(supabase_url, supabase_key)


@app.post("/markdown-to-json")
async def markdown_to_json(request: Request):
    logger.info("=== Starting markdown-to-json request ===")
    try:
        data = await request.json()
        logger.info(f"Received request data keys: {list(data.keys())}")
        
        markdown = data.get("markdown", "")
        template = data.get("template", {})
        
        logger.info(f"Markdown length: {len(markdown)} characters")
        logger.info(f"Markdown preview (first 200 chars): {markdown[:200]}...")
        logger.info(f"Template received: {template}")
        
        if not markdown:
            logger.error("No markdown provided in request")
            return {"error": "No markdown provided."}

        if not template:
            logger.error("No template configuration provided in request")
            return {"error": "No template configuration provided."}

        # Extract attributes and queries from template
        attributes = template.get("attributes", [])
        logger.info(f"Attributes to extract: {attributes}")
        
        # Build a comprehensive prompt using the configuration
        system_prompt = "You are an intelligent information extractor. Extract specific information from the document based on the provided configuration. Return ONLY valid JSON with no additional text or explanation."
        
        # Create user prompt with configuration details
        user_prompt = f"""
You are a document extraction tool designed to extract specific information from 
medical research documents. The extracted information will be used for my own 
personal publication. Focus only on the relevant factual data from the document.
ATTRIBUTES TO EXTRACT:
{json.dumps(attributes, indent=2)}

DOCUMENT TEXT:
{markdown}

Instructions:
1. For each attribute in the configuration, extract the corresponding information
2. Use the query to guide your extraction for each attribute
3. Return a JSON object where each key is the attribute name
4. If an attribute cannot be found, use null or empty string
5. Ensure the response is valid JSON only
6. Do NOT extract table data unless specifically requested in the attributes
7. If there are multiple answers to an attribute, separate them with a semicolon (;) — do not use commas to separate values.

Example output format:
{{
  "author name": "extracted author name here",
  "other_attribute": "extracted value here"
}}

Return the extracted data as a JSON object.
"""
        
        logger.info(f"System prompt length: {len(system_prompt)} characters")
        logger.info(f"User prompt length: {len(user_prompt)} characters")
        logger.info("Calling OpenAI API...")

        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
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
            logger.info(f"JSON result: {json_result}")
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


@app.post("/save-tables")
async def save_tables(request: Request):
    logger.info("=== Starting save-tables request ===")
    try:
        data = await request.json()
        logger.info(f"Received save request with keys: {list(data.keys())}")
        
        # Extract the data - handle both old 'tables' and new 'extractedData'
        metadata = data.get("metadata", {})
        tables = data.get("tables", {})  # Keep for backward compatibility
        extracted_data = data.get("extractedData", {})  # New field from DocumentUploadMarkdown
        pdf_file = data.get("pdf_file", None)  # Base64 encoded PDF
        
        # Use extracted_data if available, otherwise fall back to tables
        data_to_store = extracted_data if extracted_data else tables
        
        logger.info(f"Metadata: {metadata}")
        logger.info(f"Tables count: {len(tables) if tables else 0}")
        logger.info(f"Extracted data: {extracted_data}")
        logger.info(f"Data to store: {data_to_store}")
        
        # Create timestamp for S3 keys
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save data JSON to S3
        json_key = f"extracted_data/{timestamp}_data.json"
        json_data = json.dumps(data, indent=2)
        
        logger.info(f"S3_BUCKET_NAME: {S3_BUCKET_NAME}")
        logger.info(f"JSON data type: {type(json_data)}")
        logger.info(f"JSON data length: {len(json_data)}")
        
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=json_key,
                Body=json_data.encode('utf-8'),  # Convert string to bytes
                ContentType='application/json'
            )
            logger.info(f"Data JSON saved to S3: {json_key}")
        except Exception as s3_error:
            logger.error(f"S3 upload error: {s3_error}")
            logger.error(f"S3 error type: {type(s3_error)}")
            return {"error": f"Failed to upload to S3: {str(s3_error)}"}
        
        # Save PDF to S3 if provided
        pdf_key = None
        if pdf_file:
            try:
                import base64
                pdf_data = base64.b64decode(pdf_file.split(',')[1])
                pdf_key = f"pdfs/{timestamp}_{metadata.get('source', 'unknown')}"
                
                s3_client.put_object(
                    Bucket=S3_BUCKET_NAME,
                    Key=pdf_key,
                    Body=pdf_data,
                    ContentType='application/pdf'
                )
                logger.info(f"PDF saved to S3: {pdf_key}")
            except Exception as pdf_error:
                logger.error(f"PDF upload error: {pdf_error}")
        
        # Save to Supabase database
        db_record = {
            "filename": metadata.get('source', 'Unknown PDF'),
            "filepath": pdf_key,    # S3 key for the PDF file
            "extracted_json": json.dumps(data_to_store),  # Store the extracted data
            "created_at": datetime.now().isoformat()
        }
        
        try:
            # Insert record into Supabase
            result = supabase.table('extracted_details').insert(db_record).execute()
            logger.info(f"Record saved to Supabase: {result}")
        except Exception as db_error:
            logger.error(f"Supabase insert error: {db_error}")
            logger.error(f"Supabase error type: {type(db_error)}")
            # Continue with S3 success but log database error
            db_record = None
        
        logger.info("=== Data saved successfully ===")
        return {
            "success": True,
            "message": "Data saved successfully to S3 and database",
            "savedAt": datetime.now().isoformat(),
            "metadata": metadata,
            "s3_keys": {
                "tables_json": json_key,
                "pdf_file": pdf_key
            },
            "database_record": db_record
        }
        
    except Exception as e:
        logger.error(f"Exception in save_tables: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Failed to save data: {str(e)}"}


@app.get("/get-saved-tables")
async def get_saved_tables():
    logger.info("=== Starting get-saved-tables request ===")
    try:
        # Fetch all records from Supabase
        result = supabase.table('extracted_details').select('*').order('created_at', desc=True).execute()
        
        logger.info(f"Retrieved {len(result.data)} records from database")
        
        return {
            "success": True,
            "tables": result.data,
            "count": len(result.data)
        }
        
    except Exception as e:
        logger.error(f"Exception in get_saved_tables: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Failed to retrieve saved tables: {str(e)}"}


@app.get("/get-table-by-id/{table_id}")
async def get_table_by_id(table_id: int):
    logger.info(f"=== Starting get-table-by-id request for ID: {table_id} ===")
    try:
        # Fetch specific record from Supabase
        result = supabase.table('extracted_details').select('*').eq('id', table_id).execute()
        
        if not result.data:
            return {"error": f"Table with ID {table_id} not found"}
        
        logger.info(f"Retrieved table record: {result.data[0]}")
        
        return {
            "success": True,
            "table": result.data[0]
        }
        
    except Exception as e:
        logger.error(f"Exception in get_table_by_id: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Failed to retrieve table: {str(e)}"}


@app.post("/save-configuration")
async def save_configuration(request: Request):
    logger.info("=== Starting save-configuration request ===")
    try:
        data = await request.json()
        logger.info(f"Received configuration data: {data}")
        
        name = data.get("name", "")
        template_json = data.get("template_json", {})
        
        if not name:
            return {"error": "Configuration name is required"}
        
        if not template_json or not template_json.get("attributes"):
            return {"error": "Template JSON with attributes is required"}
        
        # Save to Supabase database
        db_record = {
            "name": name,
            "template_json": template_json,  # Don't double-encode JSON
            "created_at": datetime.now().isoformat()
        }
        
        try:
            # Insert record into Supabase
            result = supabase.table('configurations').insert(db_record).execute()
            logger.info(f"Configuration saved to Supabase: {result}")
            
            return {
                "success": True,
                "message": "Configuration saved successfully",
                "id": result.data[0]['id'] if result.data else None,
                "savedAt": datetime.now().isoformat()
            }
            
        except Exception as db_error:
            logger.error(f"Supabase insert error: {db_error}")
            logger.error(f"Supabase error type: {type(db_error)}")
            return {"error": f"Failed to save configuration to database: {str(db_error)}"}
        
    except Exception as e:
        logger.error(f"Exception in save_configuration: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Failed to save configuration: {str(e)}"}


@app.get("/get-configurations")
async def get_configurations():
    logger.info("=== Starting get-configurations request ===")
    try:
        # Fetch all configurations from Supabase
        result = supabase.table('configurations').select('*').order('created_at', desc=True).execute()
        
        logger.info(f"Retrieved {len(result.data)} configurations from database")
        
        return {
            "success": True,
            "configurations": result.data,
            "count": len(result.data)
        }
        
    except Exception as e:
        logger.error(f"Exception in get_configurations: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {"error": f"Failed to retrieve configurations: {str(e)}"}