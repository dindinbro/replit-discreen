# Modules et fonctionnalites Discreen

## Recherche par criteres (Recherche interne)
Recherche dans les bases de donnees indexees localement (SQLite FTS5).
Criteres disponibles :
- Username / Pseudo
- Email
- Adresse IP
- Nom / Prenom
- Mot de passe
- Telephone
- Hash
- Domaine
- Adresse postale

Les resultats sont groupes par fichier source et affichent les donnees correspondantes.

## Recherche globale (LeakOSINT)
Recherche etendue via l'API LeakOSINT dans des bases de donnees externes.
- Disponible pour les plans VIP et superieur
- Quotas journaliers selon le plan
- Resultats complementaires aux recherches internes

## Recherche Discord
Permet de rechercher des informations liees a un identifiant Discord.
- Disponible pour les plans VIP et superieur

## Decodeur NIR
Outil algorithmique pour decoder les numeros de securite sociale francais (NIR).
- Extraction d'informations demographiques (sexe, annee/mois de naissance, departement, commune)
- Validation de la cle de controle
- Aucune requete externe necessaire

## Recherche telephone
Utilitaire pour analyser des numeros de telephone francais :
- Normalisation du format
- Classification : mobile, fixe, VoIP
- Identification de la region
- Aucune requete API externe pour les donnees operateur

## GeoIP
Localisation geographique d'adresses IP :
- Pays, region, ville
- Coordonnees GPS
- Fournisseur d'acces (FAI)

## API Programmatique
Pour les utilisateurs du plan API (49,99€/mois) :
- Endpoint : POST /api/v1/search
- Authentification par cle API
- Gestion des cles depuis /api-keys
- Documentation disponible

## Panneau d'administration
Accessible aux administrateurs uniquement (/admin) :
- Gestion des utilisateurs (roles, gel de comptes)
- Generation de cles de licence
- Gestion des categories
- Statistiques
- Gestion des demandes de blacklist
