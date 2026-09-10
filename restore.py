import sys

with open("api/index.py", "r", encoding="utf-8") as f:
    content = f.read()

with open("missing.py", "r", encoding="utf-8") as f:
    missing = f.read()

# I need to find where to insert it.
# It should be inserted right after `isbn: str = ""` which is before `class PackageInput(BaseModel):`
# But wait, `class PackageInput` is already at the end of the file or something?
# Let's just find `    isbn: str = ""` in `api/index.py` and insert it after that.

parts = content.split('    isbn: str = ""\n')
if len(parts) == 2:
    new_content = parts[0] + '    isbn: str = ""\n' + missing + "\n" + parts[1]
    
    # Wait! If I just insert missing there, `parts[1]` already contains `class PackageInput(BaseModel):` !
    # Because my bad replacement was:
    # Target: `class NamePrice...`
    # Replacement: `class NamePrice... class PackageInput...`
    # Let's just look for `@api.delete("/cs/packages/{pid}")` in the file.
    # Ah! My multi_replace_file_content replaced from 387 to 754 with just:
    # ```
    # class NamePrice(BaseModel):
    #     name: str
    #     price: int = 0
    #
    # class PackageInput(BaseModel):
    #     name: str
    #     price: int = 0
    #     publisher: str = "Publish Inc."
    # 
    # @api.post("/cs/packages")
    # async def cs_create_package(p: PackageInput, user: dict[str, Any] = Depends(require_role("master_admin"))):
    #     return db.insert("cs_packages", p.model_dump())
    # 
    # @api.put("/cs/packages/{pid}")
    # async def cs_update_package(pid: str, p: PackageInput, user: dict[str, Any] = Depends(require_role("master_admin"))):
    #     updated = db.update("cs_packages", p.model_dump(), id=pid)
    # ```
    
    # This means the current file has:
    # `    isbn: str = ""`
    # `class NamePrice...`
    # `class PackageInput...`
    # `@api.post...`
    # `@api.put...`
    # `@api.delete...`
    
    # What I should do is:
    # Split the current `api/index.py` at `    isbn: str = ""`
    # Take `parts[0]` + `    isbn: str = ""`
    # Then add `missing.py`
    # Then add `@api.delete("/cs/packages/{pid}")` and everything after it!
    # Because my `missing.py` ALREADY contains `class NamePrice`, `class PackageInput`, and the endpoints!
    
    del_parts = content.split('@api.delete("/cs/packages/{pid}")')
    
    final_content = parts[0] + '    isbn: str = ""\n' + missing + '\n\n@api.delete("/cs/packages/{pid}")' + del_parts[1]
    
    with open("api/index.py", "w", encoding="utf-8") as f:
        f.write(final_content)
    print("RESTORED SUCCESS")
else:
    print("FAILED TO FIND SPLIT POINT")
