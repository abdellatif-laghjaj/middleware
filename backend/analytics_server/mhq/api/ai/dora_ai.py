from flask import Blueprint, jsonify
from mhq.api.request_utils import dataschema
from voluptuous import Required, Schema, Coerce, All
from mhq.service.ai.ai_analytics_service import AIAnalyticsService, LLM
import os
import logging

logger = logging.getLogger(__name__)

app = Blueprint("dora_ai", __name__)

def get_api_key_for_model(model: LLM) -> str:
    """Get the appropriate API key based on the model."""
    api_key = ""
    if model == LLM.GPT4o:
        api_key = os.getenv("OPENAI_API_KEY", "")
    elif model in [LLM.LLAMA3p1450B, LLM.LLAMA3p170B]:
        api_key = os.getenv("FIREWORKS_API_KEY", "")
    elif model == LLM.GEMINI:
        api_key = os.getenv("GEMINI_API_KEY", "")
    
    if not api_key:
        logger.warning(f"No API key found for model {model}")
    
    return api_key

@app.route("/ai/models", methods={"GET"})
def get_ai_models():
    # Check which API keys are available and only return models that have keys
    available_models = {}
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        available_models[LLM.GPT4o.value] = LLM.GPT4o.value
    
    fireworks_key = os.getenv("FIREWORKS_API_KEY")
    if fireworks_key:
        available_models[LLM.LLAMA3p1450B.value] = LLM.LLAMA3p1450B.value
        available_models[LLM.LLAMA3p170B.value] = LLM.LLAMA3p170B.value
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        available_models[LLM.GEMINI.value] = LLM.GEMINI.value

    # Log information about available models and keys
    logger.info(f"Available models: {available_models}")
    
    # If no API keys are set, return all models anyway for UI display
    if not available_models:
        return {
            LLM.GPT4o.value: LLM.GPT4o.value,
            LLM.LLAMA3p1450B.value: LLM.LLAMA3p1450B.value,
            LLM.LLAMA3p170B.value: LLM.LLAMA3p170B.value,
            LLM.GEMINI.value: LLM.GEMINI.value,
        }
    
    return available_models

@app.route("/ai/dora_score", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_dora_score(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {"dora_metrics_score": ai_service.get_dora_metrics_score(data)}
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_dora_score: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_dora_score: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500

@app.route("/ai/lead_time_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_dora_lead_time_trends(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {"lead_time_trends_summary": ai_service.get_lead_time_trend_summary(data)}
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_dora_lead_time_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_dora_lead_time_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500

@app.route("/ai/deployment_frequency_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_dora_deployment_frequency_trends(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {
            "deployment_frequency_trends_summary": ai_service.get_deployment_frequency_trend_summary(
                data
            )
        }
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_dora_deployment_frequency_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_dora_deployment_frequency_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500

@app.route("/ai/change_failure_rate_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_change_failure_rate_trends(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {
            "change_failure_rate_trends_summary": ai_service.get_change_failure_rate_trend_summary(
                data
            )
        }
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_change_failure_rate_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_change_failure_rate_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500

@app.route("/ai/mean_time_to_recovery_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_mean_time_to_recovery_trends(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {
            "mean_time_to_recovery_trends_summary": ai_service.get_mean_time_to_recovery_trends_summary(
                data
            )
        }
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_mean_time_to_recovery_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_mean_time_to_recovery_trends: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500

@app.route("/ai/dora_trends", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_dora_trends_summary(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {"dora_trend_summary": ai_service.get_dora_trends_summary(data)}
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_dora_trends_summary: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_dora_trends_summary: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500

@app.route("/ai/dora_data/compiled_summary", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("data"): dict,
            Required("model"): str,
        }
    ),
)
def get_ai_dora_summary(data: dict, model: str):
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
            
        ai_service = AIAnalyticsService(model_enum, access_token)
        return {"dora_compiled_summary": ai_service.get_dora_compiled_summary(data)}
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_dora_summary: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_dora_summary: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500
