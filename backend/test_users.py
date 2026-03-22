from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017/")
db = client["seoengine"]
for u in db.users.find({}):
    print(u)
