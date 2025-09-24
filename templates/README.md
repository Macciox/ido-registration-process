# 📋 Template Reference Files

Questa cartella contiene i file di riferimento per i template di compliance.

## 📁 Struttura

- `legal-template.csv` - Template legale MiCA con tutte le domande e scoring logic
- `whitepaper-template.csv` - Template whitepaper con tutti i controlli
- `template-comparison.md` - Confronto tra template implementato e di riferimento

## 🔄 Come usare

1. **Carica il CSV** del template legale in questa cartella
2. **Esegui il confronto** con `node compare-templates.js`
3. **Verifica differenze** tra implementato e di riferimento

## 📊 Formato CSV atteso

```csv
item_name,category,field_type,scoring_logic,description,sort_order
"Rights similar to shares/bonds","MiFID II - Financial Instrument","Yes/No","Yes = 1000, No = 0","Does the token provide rights similar to shares or bonds?",1
```

## 🧪 Script di confronto

Usa `compare-templates.js` per confrontare il template nel database con il CSV di riferimento.