import json
import requests
import time
from glob import glob
import os
import time
APIURL = os.getenv("URL")
auth = (os.getenv("USERNAME"), os.getenv("PASSWORD"))

fields = ["EntityRepository.meta.symbol",
		  "EntityRepository.meta.geneid",
		  "EntityRepository.meta.Symbols",
		  "EntityRepository.meta.ID",
		  "EntityRepository.meta.geneSymbol",
		  "EntityRepository.meta.synonyms",
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