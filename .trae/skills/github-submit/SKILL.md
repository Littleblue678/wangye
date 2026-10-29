---
name: github-submit
description: Commit the current project and push it to a GitHub repository over SSH. Use when the user asks to commit and push, publish this project to a given GitHub URL, or submit work to GitHub. Do not use for local-only commits or non-GitHub remotes.
---

# GitHub Submit

Submit the current workspace to a GitHub repository: stage intended files, create one focused commit, push over SSH, then verify the remote actually received it.

## 1. Preflight

Run these checks before touching git state.

```powershell
git rev-parse --is-inside-work-tree
git remote -v
git status --short
git config user.name; git config user.email
```

- Not a repository: `git init` and create the initial branch (`git branch -M main`).
- No identity: pass one per commit instead of writing global config:
  `git -c user.name="<name>" -c user.email="<noreply@users.noreply.github.com>" commit ...`
- Never modify global git config, and never print the contents of a private key.

Verify SSH auth. GitHub closes the session with exit code 1 even on success, so read the banner text, not the exit code.

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=15 -T git@github.com
ssh -o BatchMode=yes -o ConnectTimeout=15 -T -p 443 git@ssh.github.com
```

Success looks like `Hi <user>! You've successfully authenticated`.

## 2. Choose the remote URL

If port 22 is refused (common on restricted networks), use the SSH-over-443 URL instead of editing `~/.ssh/config`:

```powershell
git remote add origin ssh://git@ssh.github.com:443/<owner>/<repo>.git
```

Use the plain `git@github.com:<owner>/<repo>.git` form only when port 22 already authenticated.

## 3. Stage deliberately

- Add named files or directories from `git status`; avoid `git add -A` and `git add .`.
- Scan what is about to be committed for secrets: `.env`, credentials, tokens, private keys, `*.pem`, `*.key`. Stop and warn if any appear.
- Leave build output, caches, and local editor state untracked; add them to `.gitignore` instead of committing.

## 4. Commit

One commit per logical change. Subject under 70 characters, imperative mood, explaining why rather than restating filenames; add a short body when the change needs context.

```powershell
git commit -m "$(cat <<'EOF'
<subject>

<body>
EOF
)"
```

Never amend an existing commit, never `--no-verify`, never bypass signing unless the user explicitly asks.

## 5. Push

```powershell
git push -u origin <branch>
```

Never force push. Never force push to `main` or `master`.

## 6. Verify

Do not report success until the remote confirms it.

```powershell
git status
git log --oneline -1
git ls-remote origin refs/heads/<branch>
```

The local `HEAD` SHA must equal the SHA returned by `ls-remote` for the pushed branch.

If the SSH transport keeps resetting the connection on repeated reads, verify over HTTPS instead — the repository may still be reachable anonymously:

```powershell
$remote = (git ls-remote https://github.com/<owner>/<repo>.git refs/heads/<branch>).Split("`t")[0]
$local  = (git rev-parse HEAD).Trim()
```

Equal SHAs mean the push landed even when git reported a transport error.

## Failure handling

| Symptom | Action |
| --- | --- |
| `Connection refused` on port 22 | Retry the 443 URL from step 2 |
| `Permission denied (publickey)` | Report that the configured key is not registered on GitHub; do not generate or upload keys yourself |
| `Repository not found` | Confirm the repo exists, the owner name is correct, and the key belongs to an account with write access |
| `non-fast-forward` | `git pull --rebase` only after the user agrees; never force push |
| `Connection reset` during push or `ls-remote` | Verify the remote SHA over HTTPS before retrying; the push often already landed |
| Push succeeds but `ls-remote` SHA differs | Re-check the branch name; do not claim success |

## Report

State the branch, the commit subject and SHA, the remote URL used, and the verification result. Mention any files intentionally left out.
