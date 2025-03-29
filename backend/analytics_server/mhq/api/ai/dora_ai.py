from flask import Blueprint, jsonify, request
from mhq.api.request_utils import dataschema
from voluptuous import Required, Schema, Coerce, All, Optional
from mhq.service.ai.ai_analytics_service import AIAnalyticsService, LLM
import os
import logging
import json

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
        Generate a professional assessment of this contributor's activity and impact in the following format:

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
        
        Use exactly this format in your response:

        ## Summary
        [Write a brief 1-2 sentence overview of the contributor's work pattern and effectiveness]

        ## Strengths
        • [First strength point - be specific and concise]
        • [Second strength point if applicable]
        • [Third strength point if applicable]

        ## Weaknesses
        • [First area for improvement - be specific and constructive]
        • [Second area for improvement if applicable]

        ## Recommendations
        • [First actionable recommendation]
        • [Second actionable recommendation if applicable]
        
        Keep each bullet point clear, specific, and under 15 words when possible.
        Base all observations strictly on the data provided.
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

@app.route("/ai/dora_agent", methods={"POST"})
@dataschema(
    Schema(
        {
            Required("feature"): str,
            Required("query"): str,
            Required("model"): str,
            Required("data"): dict,
        }
    ),
)
def get_ai_agent_response(feature: str, query: str, model: str, data: dict):
    """
    Handle AI agent queries based on the feature type with real AI model responses.
    
    Args:
        feature: The type of AI agent feature (code_quality, performance_prediction, etc.)
        query: The user's query string
        model: The LLM model to use
        data: The DORA metrics data or other contextual data
        
    Returns:
        The AI agent's response
    """
    try:
        model_enum = getattr(LLM, model)
        access_token = get_api_key_for_model(model_enum)
        if not access_token:
            return jsonify({
                "status": "error", 
                "message": f"No API key available for {model}. Please add it to your environment variables."
            }), 400
        
        ai_service = AIAnalyticsService(model_enum, access_token)
        
        # Create feature-specific prompts for the AI model
        prompt_templates = {
            "code_quality": """
You are an AI code quality analysis agent for a DevOps platform. Analyze the following DORA metrics data to provide insights on code quality.

USER QUERY: {query}

DORA METRICS DATA:
{data_json}

Please provide a detailed analysis of code quality trends and actionable recommendations. Focus on:
1. Identifying potential code quality issues based on the data
2. Suggesting specific improvements to coding practices
3. Highlighting technical debt hotspots if present
4. Connecting code quality to deployment performance
5. Recommending testing strategies to improve reliability

Format your response using Markdown with clear sections and bullet points.
""",
            "performance_prediction": """
You are an AI team performance prediction agent for a DevOps platform. Analyze the DORA metrics and predict future performance.

USER QUERY: {query}

DORA METRICS DATA:
{data_json}

Please provide a detailed prediction of future team performance based on this historical data. Focus on:
1. Forecasting future trends for deployment frequency, lead time, change failure rate, and mean time to recovery
2. Identifying potential bottlenecks or areas of improvement
3. Suggesting specific actions to improve DORA metrics
4. Highlighting team strengths based on the data
5. Comparing current performance to industry benchmarks where relevant

Format your response using Markdown with clear sections, bullet points, and if possible, numerical projections.
""",
            "incident_response": """
You are an AI incident response assistant for a DevOps platform. Analyze the metrics to provide insights on incident management.

USER QUERY: {query}

DORA METRICS DATA:
{data_json}

Please provide detailed recommendations for incident response and prevention. Focus on:
1. Analyzing patterns in past incidents
2. Identifying the most common types of failures
3. Suggesting team member roles for addressing specific types of incidents
4. Recommending preventative measures to avoid similar incidents in the future
5. Suggesting improvements to the incident response process

Format your response using Markdown with clear sections and bullet points.
""",
            "workflow_optimization": """
You are an AI workflow optimization agent for a DevOps platform. Analyze the metrics to identify inefficiencies and suggest improvements.

USER QUERY: {query}

DORA METRICS DATA:
{data_json}

Please provide detailed recommendations for optimizing developer workflows. Focus on:
1. Identifying bottlenecks in the development pipeline
2. Analyzing inefficiencies in the code review process
3. Suggesting improvements to CI/CD processes
4. Recommending automation opportunities
5. Identifying ways to reduce lead time and increase deployment frequency

Format your response using Markdown with clear sections and bullet points.
""",
            "conversation": """
You are an AI conversational assistant for a DevOps platform. Answer the following question about team performance based on the provided data.

USER QUESTION: {query}

DORA METRICS DATA:
{data_json}

Please provide a clear, concise answer that directly addresses the user's question. Use specific data points from the provided metrics. Format your response using Markdown where appropriate, but prioritize direct and simple language that's easy to understand.
"""
        }
        
        # Select the appropriate prompt based on the feature type
        prompt_template = prompt_templates.get(feature)
        if not prompt_template:
            return jsonify({
                "status": "error", 
                "message": f"Invalid feature type: {feature}"
            }), 400
        
        # Format the prompt with the query and data
        data_json = json.dumps(data, indent=2)
        formatted_prompt = prompt_template.format(query=query, data_json=data_json)
        
        # Create messages for the AI model
        messages = [{"role": "user", "content": formatted_prompt}]
        
        # Call the AI service to get a response
        response = ai_service._fetch_completion(messages)
        
        if response.get("status") == "success":
            return {"response": response.get("data", "No response generated")}
        else:
            logger.error(f"Error getting AI response: {response.get('message')}")
            return jsonify({
                "status": "error", 
                "message": "Failed to get AI response",
                "fallback_text": "Sorry, I couldn't generate a response. Please try again later."
            }), 500
        
    except (AttributeError, ValueError) as e:
        logger.error(f"Error in get_ai_agent_response: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Invalid model: {model}. Please select a valid model."
        }), 400
    except Exception as e:
        logger.error(f"Error in get_ai_agent_response: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": f"Error processing request: {str(e)}"
        }), 500
