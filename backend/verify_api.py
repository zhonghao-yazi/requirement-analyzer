"""API 端点全面验证脚本"""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8000"
passed = 0
failed = 0

def req(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"detail": body}

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name} {detail}")
    else:
        failed += 1
        print(f"  [FAIL] {name} {detail}")

print("=" * 50)
print("  测试管理系统 — API 全面验证")
print("=" * 50)

# 1. Health check
print("\n1. GET /api/health (公开)")
status, data = req("GET", "/api/health")
check("health", status == 200 and data.get("status") == "ok", f"status={data.get('status')}, version={data.get('version')}")

# 2. Register
print("\n2. POST /api/auth/register")
status, data = req("POST", "/api/auth/register",
    {"username": "vuser", "email": "v@test.com", "password": "test123"})
check("register", status == 200 and "token" in data, f"user={data.get('user',{}).get('username','?')}")
token = data.get("token", "")

# 3. Login
print("\n3. POST /api/auth/login")
status, data = req("POST", "/api/auth/login",
    {"username": "vuser", "password": "test123"})
check("login", status == 200 and "token" in data, f"token={'OK' if data.get('token') else 'MISSING'}")
token = data.get("token", token)

# 4. Get me
print("\n4. GET /api/auth/me")
status, data = req("GET", "/api/auth/me", token=token)
check("get me", status == 200 and data.get("user", {}).get("username") == "vuser")

# 5. Unauthorized check
print("\n5. GET /api/projects (无 token)")
status, _ = req("GET", "/api/projects")
check("unauthorized blocked", status in (401, 403), f"HTTP {status}")

# 6. Create project
print("\n6. POST /api/projects")
status, data = req("POST", "/api/projects",
    {"name": "验证项目", "description": "API验证"}, token=token)
pid = data.get("data", {}).get("id")
check("create project", status in (200, 201) and pid is not None, f"id={pid}")

# 7. List projects
print("\n7. GET /api/projects")
status, data = req("GET", "/api/projects", token=token)
check("list projects", status == 200 and len(data.get("data", [])) > 0,
    f"{len(data.get('data',[]))} projects")

# 8. Create test case
print("\n8. POST /api/projects/{}/testcases".format(pid))
status, data = req("POST", f"/api/projects/{pid}/testcases",
    {"category": "核心流程", "priority": "P0", "title": "验证-登录成功",
     "preconditions": "用户已注册",
     "steps": "1. 打开登录页\n2. 输入用户名密码\n3. 点击登录",
     "expected": "1. 跳转项目列表\n2. 显示用户名"}, token=token)
cid = data.get("data", {}).get("id")
check("create testcase", status in (200, 201) and cid is not None,
    f"id={cid}, priority={data.get('data',{}).get('priority')}")

# 9. List test cases
print("\n9. GET /api/projects/{}/testcases".format(pid))
status, data = req("GET", f"/api/projects/{pid}/testcases", token=token)
check("list testcases", status == 200 and data.get("total", 0) >= 1,
    f"total={data.get('total')}")

# 10. Filter by priority
print("\n10. GET /api/projects/{}/testcases?priority=P0".format(pid))
status, data = req("GET", f"/api/projects/{pid}/testcases?priority=P0", token=token)
check("filter by priority", data.get("total", 0) >= 1,
    f"P0 cases={data.get('total')}")

# 11. Update test case
print("\n11. PUT /api/testcases/{}".format(cid))
status, data = req("PUT", f"/api/testcases/{cid}",
    {"status": "approved", "priority": "P1"}, token=token)
updated = data.get("data", {})
check("update testcase", updated.get("status") == "approved" and updated.get("priority") == "P1",
    f"status={updated.get('status')}, priority={updated.get('priority')}")

# 12. Search
print("\n12. GET /api/projects/{}/testcases?search=登录".format(pid))
import urllib.parse
q = urllib.parse.quote("登录")
status, data = req("GET", f"/api/projects/{pid}/testcases?search={q}", token=token)
check("search testcases", data.get("total", 0) >= 1,
    f"search '登录' → {data.get('total')} results")

# 13. Batch delete
print("\n13. PATCH /api/testcases/batch (delete)")
status, data = req("PATCH", "/api/testcases/batch",
    {"ids": [cid], "action": "delete"}, token=token)
check("batch delete", status == 200, f"message={data.get('message','?')}")

# 14. Delete project (cascade)
print("\n14. DELETE /api/projects/{}".format(pid))
status, data = req("DELETE", f"/api/projects/{pid}", token=token)
check("delete project", status == 200, f"message={data.get('message','?')}")

# Summary
print("\n" + "=" * 50)
print(f"  结果: {passed} 通过, {failed} 失败, {passed+failed} 总计")
if failed == 0:
    print("  全部 API 端点验证通过！")
else:
    print(f"  有 {failed} 项失败，请检查")
print("=" * 50)
