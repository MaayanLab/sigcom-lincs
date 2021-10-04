import json
import requests
import time
from glob import glob
import os

APIURL = os.getenv("URL")
auth = (os.getenv("USERNAME"), os.getenv("PASSWORD"))
res = requests.get(APIURL + "schemas")
for s in res.json():
	r = requests.delete(APIURL + "schemas" + "/"+s["id"], auth=auth)
	if not r.ok:
		print(s["id"])

# with open("schemas.json") as o:
# 	schemas = json.loads(o.read())
# 	for s in schemas:
# 		res = requests.post(APIURL + "schemas", json=s, auth=auth)
# 		if not res.ok:
# 			print(s["id"])
# 			print(res.text)

with open("schemas/counting.json") as o:
	schemas = json.loads(o.read())
	for schema in schemas:
		res = requests.post(APIURL + "schemas", json=schema, auth=auth)
		if not res.ok:
			print(schema["id"])
			print(res.text)

for filename in glob('schemas/ui-schemas/*.json'):
	print(filename)
	with open(filename) as o:
		schema = json.loads(o.read())
		res = requests.post(APIURL + "schemas", json=schema, auth=auth)
		if not res.ok:
			print(schema["id"])
			print(res.text)

with open("schemas/landing.json") as o:
	schema = json.loads(o.read())
	res = requests.post(APIURL + "schemas", json=schema, auth=auth)
	if not res.ok:
		print(schema["id"])
		print(res.text)
		

# res = requests.get(APIURL + "optimize/refresh", auth=auth)

# res = requests.get(APIURL + "optimize/status", auth=auth)
# while (not res.text=="Ready"):
# 	time.sleep(2)
# 	res = requests.get(APIURL + "optimize/status", auth=auth)
# print(res.text)


res = requests.get(APIURL + "summary/refresh", auth=auth)

res = requests.get(APIURL + "summary/status", auth=auth)
print(res.text)
while (not res.text=="Ready"):
	time.sleep(2)
	res = requests.get(APIURL + "summary/status", auth=auth)