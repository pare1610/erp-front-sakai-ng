# To execute in PowerShell, save this script as dockerdeploy.ps1 and run it in the terminal. with the command ./dockerdeploy.ps1

# Set in a variable the Docker context to the remote Linux server where the container will be deployed.
$ctx = "linux-mds-server"

# Build the new image first: if the build fails, the running container is left untouched.
docker --context $ctx build -t angular-app:latest .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed; the current container was not replaced."
    exit 1
}

# Stop and remove the existing container if it exists.
docker --context $ctx rm -f angular-container 2>$null | Out-Null

# Run the container in detached mode and restart it automatically unless stopped manually.
docker --context $ctx run -d --name angular-container --restart unless-stopped -p 9080:80 angular-app:latest

# Remove the previous image, now untagged and unused.
docker --context $ctx image prune -f | Out-Null
