"""
GitHub 代码同步脚本 — 批量推送本地变更到 GitHub

用法:
    python scripts/github_sync.py                          # 推送所有变更
    python scripts/github_sync.py --dry-run                # 仅预览，不实际推送
    python scripts/github_sync.py --files file1.js file2.py  # 仅推送指定文件
"""
import json, base64, subprocess, os, sys, urllib.request, argparse, io

# 修复 Windows GBK 编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ===== 配置 ====
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_config():
    """从 .mcp.json 读取 GitHub token，从 git remote 读取仓库信息"""
    mcp_path = os.path.join(BASE, '.mcp.json')
    with open(mcp_path, 'r') as f:
        mcp = json.load(f)
    token = mcp.get('mcpServers', {}).get('github', {}).get('env', {}).get('GITHUB_PERSONAL_ACCESS_TOKEN', '')
    if not token:
        print('❌ 未找到 GitHub Token（检查 .mcp.json → mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN）')
        sys.exit(1)

    # 获取仓库信息
    result = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True, cwd=BASE)
    url = result.stdout.strip()
    # 支持两种格式: https://github.com/owner/repo.git 和 git@github.com:owner/repo.git
    if url.startswith('https://'):
        repo_part = url.replace('https://github.com/', '').replace('.git', '')
    else:
        repo_part = url.split(':')[1].replace('.git', '')
    owner, repo = repo_part.split('/')
    return token, owner, repo

def git_changed_files():
    """获取本地变更文件列表（已跟踪的修改 + 未跟踪的新文件）"""
    result = subprocess.run(
        ['git', 'diff', '--name-only', 'HEAD'], capture_output=True, text=True, cwd=BASE
    )
    modified = [f.strip().replace('\\', '/') for f in result.stdout.strip().split('\n') if f.strip()]

    result2 = subprocess.run(
        ['git', 'ls-files', '--others', '--exclude-standard'], capture_output=True, text=True, cwd=BASE
    )
    untracked = [f.strip().replace('\\', '/') for f in result2.stdout.strip().split('\n') if f.strip()]

    return modified, untracked

def get_commit_message():
    """获取最近一次 commit message 作为默认推送消息"""
    result = subprocess.run(
        ['git', 'log', '-1', '--format=%s'], capture_output=True, text=True, cwd=BASE
    )
    return result.stdout.strip() or 'update files'

def push_file(token, owner, repo, branch, file_path, content, message):
    """推送单个文件到 GitHub"""
    api_url = f'https://api.github.com/repos/{owner}/{repo}/contents/{file_path}'

    # 先检查文件是否已存在（获取 SHA）
    req = urllib.request.Request(f'{api_url}?ref={branch}', headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'github-sync-script',
    })
    sha = None
    try:
        with urllib.request.urlopen(req) as resp:
            d = json.loads(resp.read())
            sha = d.get('sha')
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise

    # 构建请求体
    data = {
        'message': message,
        'content': base64.b64encode(content.encode('utf-8')).decode('ascii'),
        'branch': branch,
    }
    if sha:
        data['sha'] = sha

    body = json.dumps(data, ensure_ascii=False)
    result = subprocess.run([
        'curl', '-s', '-w', '\n%{http_code}', api_url,
        '-H', f'Authorization: Bearer {token}',
        '-H', 'Accept: application/vnd.github+json',
        '-X', 'PUT', '-d', body,
    ], capture_output=True, text=True, encoding='utf-8', timeout=30)
    lines = result.stdout.strip().split('\n')
    status = lines[-1] if lines else '000'
    return status in ('200', '201'), status, lines[0] if lines else ''

def main():
    parser = argparse.ArgumentParser(description='GitHub 代码同步')
    parser.add_argument('--dry-run', action='store_true', help='仅预览，不推送')
    parser.add_argument('--files', nargs='*', help='仅推送指定文件')
    parser.add_argument('--branch', default='main', help='目标分支（默认 main）')
    args = parser.parse_args()

    token, owner, repo = load_config()
    message = get_commit_message()
    modified, untracked = git_changed_files()

    if args.files:
        files_to_push = [('modified' if f in modified else 'new', f) for f in args.files]
    else:
        files_to_push = [('modified', f) for f in modified] + [('new', f) for f in untracked]

    if not files_to_push:
        print('✅ 没有需要推送的文件')
        return

    print(f'仓库: {owner}/{repo}  分支: {args.branch}')
    print(f'提交信息: {message}')
    print(f'待推送: {len(files_to_push)} 个文件')
    print('-' * 50)

    ok, fail = 0, 0
    for status, file_path in files_to_push:
        fpath = os.path.join(BASE, file_path.replace('/', os.sep))
        if not os.path.isfile(fpath):
            print(f'⏭  {file_path} (跳过: 非文件)')
            continue

        if args.dry_run:
            tag = '📝更新' if status == 'modified' else '🆕新增'
            size = os.path.getsize(fpath)
            print(f'{tag} {file_path} ({size/1024:.1f} KB)')
            continue

        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        success, code, err = push_file(token, owner, repo, args.branch, file_path, content, message)
        if success:
            print(f'✅ {file_path}')
            ok += 1
        else:
            print(f'❌ {file_path} (HTTP {code}): {err[:100]}')
            fail += 1

    print('-' * 50)
    if args.dry_run:
        print(f'📋 预览完成，共 {len(files_to_push)} 个文件（未实际推送）')
    else:
        print(f'完成: {ok} 成功, {fail} 失败')

if __name__ == '__main__':
    main()
