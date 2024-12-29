import sys
import json
import subprocess
import asyncio

async def check_email(email):
    try:
        # Run holehe CLI command
        process = await asyncio.create_subprocess_exec(
            'holehe', email,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            print(f"Error running holehe: {stderr.decode()}", file=sys.stderr)
            return []

        # Parse the output
        output = stdout.decode()
        results = []

        # Process each line of output
        for line in output.split('\n'):
            if '[+]' in line or '[-]' in line:
                # Extract service name and status
                parts = line.strip().split()
                if len(parts) >= 2:
                    service = parts[1]
                    exists = '[+]' in line

                    # Create result object
                    result = {
                        'name': service,
                        'exists': exists,
                        'emailrecovery': None,
                        'phoneNumber': None,
                        'others': None,
                        'rateLimit': False
                    }

                    # Extract additional info if available
                    if 'email recovery:' in line.lower():
                        result['emailrecovery'] = line.split('email recovery:')[-1].strip()
                    if 'phone number:' in line.lower():
                        result['phoneNumber'] = line.split('phone number:')[-1].strip()

                    results.append(result)

        return results

    except Exception as e:
        print(f"Error checking email: {str(e)}", file=sys.stderr)
        return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python holehe_search.py <email>", file=sys.stderr)
        sys.exit(1)

    email = sys.argv[1]
    results = asyncio.run(check_email(email))
    print(json.dumps(results))