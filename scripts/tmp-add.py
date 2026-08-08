# -*- coding: utf-8 -*-
"""Ajout de genres dans src/data/corpus.json, sans rien ecraser.

Prend une liste de tuples et n'ecrit que ce qui n'existe pas deja. Les morceaux
partent vides : ils seront remplis par import-tracks et fetch-covers, qui ont
leur propre verification. Aucun identifiant n'est jamais invente ici."""
import json, sys

CORPUS='/Users/mauditemachine/Dev/Sonaa/src/data/corpus.json'

def add(families, genres):
    d=json.load(open(CORPUS))
    have={g['id'] for g in d['genres']}
    famhave={f['id'] for f in d['families']}
    for fid,label,hue in families:
        if fid in famhave: continue
        d['families'].append({'id':fid,'label':label,'hue':hue})
    n=0
    for g in genres:
        if g['id'] in have: continue
        entry={'id':g['id'],'label':g['label'],'family':g['family'],
               'structuralParent':g.get('parent'),
               'parents':g.get('parents',[]),
               'confidence':g.get('conf','established'),
               'bpm':(list(g['bpm']) if g['bpm'] else None),'major':bool(g.get('major',False)),
               'note':g['note']}
        if g.get('structuralOnly'): entry['structuralOnly']=True
        if g.get('aliases'): entry['aliases']=g['aliases']
        entry['tracks']={'essentiel':[],'actuel':[]}
        d['genres'].append(entry); n+=1
    # greffes a ajouter sur des genres existants
    return d, n

def graft(d, pairs):
    byid={g['id']:g for g in d['genres']}
    k=0
    for gid, pid, pfam, conf in pairs:
        g=byid.get(gid)
        if not g: print('  greffe ignoree, genre absent:', gid); continue
        if pid not in byid: print('  greffe ignoree, parent absent:', pid); continue
        if any(p['id']==pid for p in g['parents']): continue
        g['parents'].append({'id':pid,'family':pfam,'confidence':conf}); k+=1
    return k

def save(d):
    json.dump(d, open(CORPUS,'w'), ensure_ascii=False, indent=1)
