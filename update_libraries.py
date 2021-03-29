import json
import requests
import time
import os

APIURL = os.getenv("URL", "https://maayanlab.cloud/sigcom-lincs/metadata-api/")
auth = (os.getenv("USERNAME", "admin"), os.getenv("PASSWORD", "admin"))

with open("libraries.json") as o:
	libraries = json.loads(o.read())

for lib in libraries:
	res = requests.patch(APIURL+"/libraries/"+lib["id"], json=lib, auth=auth)
	if not res.ok:
		print(res.text)
