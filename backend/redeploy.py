#!/usr/bin/env python3
"""
Harpoon Backend Redeploy Script
Builds, pushes, and redeploys the backend container to ECS.
Run from the backend directory.
"""

import subprocess
import boto3
import time

# ── CONFIG ───────────────────────────────────────────────────────────────────
REGION = "us-east-1"
ACCOUNT_ID = "187496080130"
ECR_REPO = f"{ACCOUNT_ID}.dkr.ecr.{REGION}.amazonaws.com/harpoon-backend"
CLUSTER = "harpoon"
SERVICE = "harpoon-backend-service"
# ─────────────────────────────────────────────────────────────────────────────


def run(cmd, description):
    print(f"\n→ {description}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"  ✗ Failed: {cmd}")
        raise SystemExit(1)
    print(f"  ✓ Done")


def ecr_login():
    print("\n→ Authenticating Docker to ECR...")
    token = subprocess.check_output(
        f"aws ecr get-login-password --region {REGION}", shell=True
    ).decode().strip()
    result = subprocess.run(
        f"docker login --username AWS --password-stdin {ACCOUNT_ID}.dkr.ecr.{REGION}.amazonaws.com",
        input=token.encode(),
        shell=True
    )
    if result.returncode != 0:
        raise SystemExit("ECR login failed")
    print("  ✓ Done")


def force_redeploy():
    print("\n→ Forcing new ECS deployment...")
    ecs = boto3.client("ecs", region_name=REGION)
    ecs.update_service(
        cluster=CLUSTER,
        service=SERVICE,
        forceNewDeployment=True
    )
    print("  ✓ Deployment triggered")


def wait_for_stable():
    print("\n→ Waiting for service to stabilize...")
    ecs = boto3.client("ecs", region_name=REGION)
    for i in range(24):  # wait up to ~4 minutes
        response = ecs.describe_services(cluster=CLUSTER, services=[SERVICE])
        deployments = response["services"][0]["deployments"]
        running = deployments[0]["runningCount"]
        pending = deployments[0]["pendingCount"]
        print(f"  running={running} pending={pending}", end="\r")
        if running == 1 and pending == 0 and len(deployments) == 1:
            print(f"\n  ✓ Service stable — 1 task running")
            return
        time.sleep(10)
    print("\n  ⚠ Timed out waiting — check ECS console for status")


def main():
    print("=" * 50)
    print("  Harpoon Backend Redeploy")
    print("=" * 50)

    run("docker build -t harpoon-backend .", "Building Docker image")
    run(f"docker tag harpoon-backend:latest {ECR_REPO}:latest", "Tagging image")
    ecr_login()
    run(f"docker push {ECR_REPO}:latest", "Pushing to ECR")
    force_redeploy()
    wait_for_stable()

    print("\n" + "=" * 50)
    print("  ✓ Redeploy complete — https://api.harpoon.online")
    print("=" * 50)


if __name__ == "__main__":
    main()
