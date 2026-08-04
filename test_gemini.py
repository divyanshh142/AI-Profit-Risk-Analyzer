from google import genai

client = genai.Client(api_key=""GEMINI_API_KEY"")

response = client.models.generate_content(
    model= "models/gemini-flash-latest",
    contents="Reply with exactly: API OK"
)

print(response.text)