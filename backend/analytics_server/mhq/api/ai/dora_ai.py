from flask import Blueprint, jsonify, request
from mhq.api.request_utils import dataschema
from voluptuous import Required, Schema, Coerce, All, Optional
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

@app.route("/ai/contributor-summary", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("contributor_data"): dict,
            Optional("model"): str,
        }
    )
)
def generate_contributor_summary(contributor_data, model=LLM.GEMINI.value):
    """
    Generate an AI-powered summary of a contributor's activity and impact.
    
    Args:
        contributor_data: Dictionary containing contributor metrics and activity
        model: AI model to use for generation (defaults to Gemini)
    
    Returns:
        JSON response with the generated summary
    """
    try:
        # Determine which model to use
        model_enum = LLM.GEMINI
        try:
            model_enum = LLM(model)
        except ValueError:
            logger.warning(f"Invalid model {model}, falling back to {LLM.GEMINI}")
        
        # Get API key for the model
        api_key = get_api_key_for_model(model_enum)
        
        # Handle missing API key gracefully
        if not api_key:
            return jsonify({
                "status": "error",
                "message": "API key not found for the selected model",
                "fallback_text": "Contributor summary not available. Please check your AI service configuration."
            }), 400
            
        # Prepare the prompt for the AI model
        name = contributor_data.get('name', 'This contributor')
        username = contributor_data.get('username', 'unknown')
        
        prompt = f"""
        Generate a concise, professional summary of this contributor's activity and impact:

        Name: {name} ({username})
        PRs Created: {contributor_data.get('prs', 0)}
        Deployments: {contributor_data.get('deploymentCount', 0)}
        Successful Deployments: {contributor_data.get('successfulDeployments', 0)}
        Failed Deployments: {contributor_data.get('failedDeployments', 0)}
        Lead Time for Changes: {contributor_data.get('leadTimeFormatted', 'N/A')}
        Additions: {contributor_data.get('additions', 0)}
        Deletions: {contributor_data.get('deletions', 0)}
        Merge Time: {contributor_data.get('mergeTimeFormatted', 'N/A')}
        Rework Time: {contributor_data.get('reworkTimeFormatted', 'N/A')}
        
        So based on this data, please generate a summary of the contributor's activity and impact. (because the reviers/,aninteris of project will see this) so it should be impactlfuu summary to help them optimse the performance of the project.
        """
        
        # Initialize the AI service and get a response
        ai_service = AIAnalyticsService(model_enum, api_key)
        messages = [{"role": "user", "content": prompt}]
        response = ai_service._fetch_completion(messages)
        
        if response.get("status") == "success":
            return jsonify({
                "status": "success",
                "summary": response.get("data", "No summary generated")
            })
        else:
            # Log the error but return a user-friendly message
            logger.error(f"Error generating summary: {response.get('message')}")
            return jsonify({
                "status": "error",
                "message": "Unable to generate summary",
                "fallback_text": "Summary generation failed. Please try again later."
            }), 500
            
    except Exception as e:
        logger.error(f"Exception in contributor summary generation: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": str(e),
            "fallback_text": "An error occurred while generating the summary."
        }), 500
