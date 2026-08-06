import asyncio
import httpx

async def get_error():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=10.0) as client:
        login_data = {"username": "admin", "password": "password123"}
        response = await client.post("/auth/login", data=login_data)
        token = response.json()["access_token"]
        
        errs_resp = await client.get("/errors", headers={"Authorization": f"Bearer {token}"})
        print(errs_resp.status_code)
        print(errs_resp.text)

if __name__ == "__main__":
    asyncio.run(get_error())
