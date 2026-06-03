# Configuration gratuite de l'analyse CV via Ollama (local)
$ollama = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollama)) {
  Write-Host "Ollama non installé. Installez depuis https://ollama.com ou: winget install Ollama.Ollama"
  exit 1
}
Write-Host "Téléchargement du modèle llama3.2 (une seule fois)..."
& $ollama pull llama3.2
Write-Host "OK. Vérifiez backend/.env : CV_LLM_PROVIDER=ollama"
Write-Host "Redémarrez le backend (npm run dev) puis ré-uploadez votre CV."
