from db import voters_col

for v in voters_col.find():
    print(v)
