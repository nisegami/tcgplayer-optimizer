#!/usr/bin/env fish

# Check if loadenv plugin is available
if not type -q loadenv
    echo "Error: loadenv plugin is not installed."
    echo "Install it with: fisher install berk-karaal/loadenv.fish"
    exit 1
end

# Function to handle cleanup on exit
function cleanup
    echo "Cleaning up environment variables..."
    loadenv --unload
end

# Register the cleanup function to run when the script exits
# or when it receives common termination signals
function handle_signal --on-signal INT --on-signal TERM --on-signal HUP
    echo "Received termination signal. Cleaning up..."
    cleanup
    exit 1
end

# Load environment variables from .env file
echo "Loading environment variables from .env file..."
loadenv

# Check if loading was successful
if test $status -ne 0
    echo "Error: Failed to load environment variables from .env file."
    exit 1
end

echo "Starting Node.js server..."
node .output/server/index.mjs

# Run cleanup after the server process exits
cleanup

# Unregister signal handlers
function handle_signal --on-signal INT --on-signal TERM --on-signal HUP
end