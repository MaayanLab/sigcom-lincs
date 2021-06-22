import json
import requests
import time
from glob import glob
import os
import time
APIURL = os.getenv("URL")
auth = (os.getenv("USERNAME"), os.getenv("PASSWORD"))

fields = ["SignatureRepository.meta",
		  "LibraryRepository.meta",
		]

for f in fields:
	res = requests.get(APIURL + "optimize/index", auth=auth, params={"field": f, "method": "gin"})
	if not res.ok:
		print(res.text)
	res = requests.get(APIURL + "optimize/status", auth=auth)
	while res.text!='Ready':
		time.sleep(1)
		res = requests.get(APIURL + "optimize/status", auth=auth)
	print(res.text)

# res = requests.get(APIURL + "optimize/status", auth=auth)
# print(res.text)