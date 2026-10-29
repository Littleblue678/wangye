# Commit the current project and push it to GitHub over SSH.
# Usage: .\github-push.ps1 -RepoUrl "ssh://git@ssh.github.com:443/<owner>/<repo>.git" -Message "feat: ..." [-Branch main]
param(
  [Parameter(Mandatory = $true)][string]$RepoUrl,
  [Parameter(Mandatory = $true)][string]$Message,
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
  git init
  git branch -M $Branch
}

if (-not (git remote get-url origin 2>$null)) {
  git remote add origin $RepoUrl
} else {
  git remote set-url origin $RepoUrl
}

git add index.html style.css script.js game-core.js spec.md docs tests .trae/skills
git commit -m $Message

git push -u origin $Branch

git status
$local = (git rev-parse HEAD).Trim()
$remote = (git ls-remote origin "refs/heads/$Branch").Split("`t")[0]
if ($local -eq $remote) {
  Write-Host "verified: $Branch at $local"
} else {
  throw "verification failed: local $local, remote $remote"
}
