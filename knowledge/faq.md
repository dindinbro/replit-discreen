# FAQ Discreen

## Qu'est-ce que Discreen ?
Discreen est un moteur de recherche specialise dans l'analyse de fuites de donnees (data dumps). Il permet de rechercher des informations a travers plusieurs bases de donnees indexees et des services externes.

## Comment creer un compte ?
Rendez-vous sur la page de connexion (/login). Vous pouvez creer un compte avec votre adresse email. La verification par email est requise.

## Comment effectuer une recherche ?
1. Connectez-vous a votre compte
2. Allez sur la page d'accueil (/) ou la page de recherche (/search)
3. Selectionnez un critere de recherche (email, pseudo, telephone, IP, etc.)
4. Entrez votre terme de recherche et cliquez sur le bouton recherche

## Quels sont les types de recherche disponibles ?
- **Recherche par criteres** : username, email, IP, nom, prenom, mot de passe, telephone, hash, domaine, adresse
- **Recherche globale (LeakOSINT)** : recherche etendue dans des bases externes
- **Recherche Discord** : recherche d'identifiants Discord
- **Decodeur NIR** : decode les numeros de securite sociale francais
- **Recherche telephone** : identifie operateur, type (mobile/fixe/VoIP) et region des numeros francais
- **GeoIP** : localisation geographique d'adresses IP

## Comment fonctionne le systeme de credits ?
Chaque plan dispose d'un nombre de recherches quotidiennes. Les credits se renouvellent automatiquement chaque jour a minuit. Les recherches non utilisees ne sont pas cumulables.

## Comment contacter le support ?
- Par Discord : ouvrez un ticket dans le serveur Discord Discreen
- Par le site : rendez-vous sur la page Contact (/contact)

## Comment laisser un avis ?
Utilisez la commande `/vouch` dans le serveur Discord Discreen. Votre avis sera soumis a validation par un administrateur avant d'apparaitre sur le site.

## Que faire si mon compte est gele ?
Contactez le support via Discord. Un administrateur pourra examiner votre situation et eventuellement degeler votre compte.

## Comment changer mon avatar ou mon nom d'affichage ?
Rendez-vous sur la page Profil (/profile) accessible depuis le menu utilisateur dans l'en-tete du site.

## L'API est-elle disponible ?
Oui, pour les utilisateurs avec un abonnement API (49,99€/mois). Vous pouvez gerer vos cles API depuis la page /api-keys. L'endpoint principal est /api/v1/search.
