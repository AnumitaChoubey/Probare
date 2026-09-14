param (
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$BasePath = (Get-Item -Path ".\").FullName

if (Test-Path "build_venv") {
    if ($Clean) {
        Write-Host "Removing existing build_venv..."
        Remove-Item -Recurse -Force "build_venv"
        python -m venv build_venv
    }
} else {
    python -m venv build_venv
}

Write-Host "Activating build_venv and installing dependencies..."
.\build_venv\Scripts\python -m pip install --upgrade pip
.\build_venv\Scripts\pip install -r requirements.txt
.\build_venv\Scripts\pip install pyinstaller

Write-Host "Running PyInstaller..."
.\build_venv\Scripts\pyinstaller qems-backend.spec --clean

Write-Host "Build complete! Output is in dist/qems-backend.exe"
