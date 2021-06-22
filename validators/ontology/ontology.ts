import fetch from 'node-fetch'
import {strict as assert} from 'assert' // node env v 9 did not support "import assert..."

async function mapToUniPort(meta: {tissue: string, anatomy: string}): Promise<any> {
  const {tissue, anatomy} = meta
  const url = `https://www.ebi.ac.uk/ols/api/select?q=${anatomy}`
  const {response} = await (await fetch(url, 
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }
  )).json()
  return response.docs.filter(r=>r.obo_id===anatomy && r.label===tissue)
}
  
  
export default async function validator(meta: {tissue: string, anatomy: string}): Promise<any> {
  let proteins = await mapToUniPort(meta);
  assert.notEqual(proteins.length, 0); 
  //if no entries found then input does not correspond to a protein in UniProt
  return meta
}  