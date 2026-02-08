import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Scale,
  Shield,
  Users,
  AlertTriangle,
  Lock,
  Database,
  Gavel,
  Mail,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";

const SECTIONS = [
  { id: "preambule", label: "Preambule", icon: BookOpen },
  { id: "definitions", label: "Art. 1 — Definitions", icon: FileText },
  { id: "description", label: "Art. 2 — Description du Service", icon: Database },
  { id: "acces", label: "Art. 3 — Conditions d'acces", icon: Users },
  { id: "autorisees", label: "Art. 4 — Utilisations autorisees", icon: Shield },
  { id: "interdites", label: "Art. 5 — Utilisations interdites", icon: AlertTriangle },
  { id: "responsabilite-utilisateur", label: "Art. 6 — Responsabilite Utilisateur", icon: Scale },
  { id: "responsabilite-prestataire", label: "Art. 7 — Responsabilite Prestataire", icon: Gavel },
  { id: "donnees", label: "Art. 8 — Donnees personnelles", icon: Lock },
  { id: "demandes", label: "Art. 9 — Demandes relatives aux donnees", icon: Mail },
  { id: "propriete", label: "Art. 10 — Propriete intellectuelle", icon: FileText },
  { id: "suspension", label: "Art. 11 — Suspension et resiliation", icon: AlertTriangle },
  { id: "modification", label: "Art. 12 — Modification des CGU", icon: FileText },
  { id: "droit", label: "Art. 13 — Droit applicable", icon: Gavel },
];

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("preambule");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />

      <div className="relative container max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 space-y-3"
        >
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-primary/30 text-primary gap-2 no-default-hover-elevate no-default-active-elevate" data-testid="badge-documentation">
            <FileText className="w-3.5 h-3.5" />
            Document Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-doc-title">
            Conditions Generales d'Utilisation
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-doc-subtitle">
            Discreen — Derniere mise a jour : 8 fevrier 2026
          </p>
        </motion.div>

        <div className="flex gap-8">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block w-72 shrink-0"
          >
            <div className="sticky top-20">
              <Card className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2" data-testid="text-summary-label">Sommaire</p>
                <ScrollArea className="max-h-[calc(100vh-12rem)]">
                  <nav className="space-y-0.5" data-testid="nav-doc-summary">
                    {SECTIONS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => scrollToSection(s.id)}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors hover-elevate ${
                            activeSection === s.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground"
                          }`}
                          data-testid={`button-nav-${s.id}`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </Card>
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 min-w-0"
          >
            <Card className="p-6 md:p-10">
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-foreground/90">

                <section id="preambule" data-testid="section-preambule">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Preambule
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Les presentes Conditions Generales d'Utilisation (ci-apres « CGU ») regissent l'acces et l'utilisation du service Discreen (ci-apres « le Service »), edite par le Prestataire (ci-apres « le Prestataire » ou « Nous »).
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'utilisation du Service implique l'acceptation pleine et entiere des presentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le Service.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="definitions" data-testid="section-definitions">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    Article 1 — Definitions
                  </h2>
                  <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0">
                    <li><strong className="text-foreground">Service</strong> : Designe la plateforme Discreen, accessible via le site web et son API, permettant la recherche d'informations dans des bases de donnees issues de fuites tierces.</li>
                    <li><strong className="text-foreground">Utilisateur</strong> : Designe toute personne physique ou morale accedant au Service, qu'elle dispose ou non d'un compte.</li>
                    <li><strong className="text-foreground">Compte</strong> : Designe l'espace personnel cree par l'Utilisateur lui permettant d'acceder aux fonctionnalites du Service.</li>
                    <li><strong className="text-foreground">Donnees Indexees</strong> : Designe les informations provenant de fuites de donnees tierces, prealablement rendues publiquement accessibles sur Internet, referencees par le Service.</li>
                    <li><strong className="text-foreground">API</strong> : Designe l'interface de programmation applicative permettant l'acces programmatique au Service.</li>
                    <li><strong className="text-foreground">Cle API</strong> : Designe l'identifiant unique attribue a l'Utilisateur pour l'acces a l'API payante.</li>
                  </ul>
                </section>

                <hr className="border-border/50" />

                <section id="description" data-testid="section-description">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-primary" />
                    Article 2 — Description du Service
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">2.1 Nature du Service</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Discreen est un moteur de recherche indexant et referencant des informations provenant de fuites de donnees tierces prealablement rendues publiquement accessibles sur Internet.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire n'est pas a l'origine de ces fuites de donnees et n'a pas participe a leur obtention, leur diffusion initiale ou leur publication. Le Service agit exclusivement en qualite d'intermediaire technique facilitant la recherche d'informations deja accessibles au public.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">2.2 Fonctionnalites</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Service permet de rechercher des informations selon differents criteres, notamment : nom, prenom, adresse email, numero de telephone, adresse postale, code postal, ville, date de naissance, et autres identifiants.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">2.3 Offres disponibles</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">Le Service propose :</p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Un acces gratuit via l'interface web, soumis a creation de compte</li>
                    <li>Un acces API payant selon les formules detaillees dans les Conditions Generales de Vente</li>
                  </ul>
                </section>

                <hr className="border-border/50" />

                <section id="acces" data-testid="section-acces">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-primary" />
                    Article 3 — Conditions d'acces
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.1 Age minimum</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">L'acces au Service est strictement reserve aux personnes agees de dix-huit (18) ans revolus.</strong>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    En creant un compte, l'Utilisateur certifie avoir atteint l'age de 18 ans. Le Prestataire se reserve le droit de demander une preuve d'age et de suspendre ou supprimer tout compte dont le titulaire ne satisferait pas a cette condition.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.2 Creation de compte</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'acces aux fonctionnalites de recherche necessite la creation d'un compte. L'Utilisateur s'engage a :
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Fournir des informations exactes et a jour</li>
                    <li>Maintenir la confidentialite de ses identifiants de connexion</li>
                    <li>Ne pas creer plusieurs comptes</li>
                    <li>Notifier immediatement le Prestataire de toute utilisation non autorisee de son compte</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur est seul responsable de toute activite effectuee depuis son compte.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">3.3 Verification et validation</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire se reserve le droit de verifier l'identite des Utilisateurs et de refuser ou revoquer l'acces a toute personne ne respectant pas les presentes CGU.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="autorisees" data-testid="section-autorisees">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    Article 4 — Utilisations autorisees
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                    L'Utilisateur s'engage a utiliser le Service exclusivement pour les finalites suivantes :
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">a) Verification personnelle</p>
                      <p className="text-sm text-muted-foreground">Verifier si ses propres donnees personnelles ont ete compromises dans une fuite de donnees.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">b) Recherche en securite informatique</p>
                      <p className="text-sm text-muted-foreground">Effectuer des recherches dans le cadre d'activites legitimes de cybersecurite, de veille en menaces (threat intelligence) ou de recherche OSINT (Open Source Intelligence).</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">c) Audit de securite organisationnel</p>
                      <p className="text-sm text-muted-foreground">Realiser des audits de securite pour le compte de son organisation ou d'un client ayant expressement autorise cette demarche.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">d) Sensibilisation</p>
                      <p className="text-sm text-muted-foreground">Contribuer a la sensibilisation a la protection des donnees personnelles et a la cybersecurite.</p>
                    </div>
                  </div>
                </section>

                <hr className="border-border/50" />

                <section id="interdites" data-testid="section-interdites">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    Article 5 — Utilisations interdites
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                    <strong className="text-foreground">L'Utilisateur s'interdit formellement d'utiliser le Service pour :</strong>
                  </p>

                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">5.1 Atteintes aux personnes</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Harceler, traquer, menacer, intimider ou nuire a toute personne physique ou morale</li>
                    <li>Pratiquer le « doxing », c'est-a-dire exposer publiquement des donnees personnelles a des fins malveillantes ou sans le consentement de la personne concernee</li>
                    <li>Porter atteinte a la vie privee, a l'honneur ou a la reputation d'autrui</li>
                  </ul>

                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">5.2 Activites frauduleuses</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Commettre ou faciliter une usurpation d'identite</li>
                    <li>Commettre ou faciliter une fraude, une escroquerie ou toute infraction penale</li>
                    <li>Acceder de maniere non autorisee a des comptes, systemes ou reseaux tiers</li>
                    <li>Contourner des mesures de securite ou d'authentification</li>
                  </ul>

                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">5.3 Exploitation commerciale illicite</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Demarcher commercialement des personnes dont les donnees apparaissent dans les resultats de recherche</li>
                    <li>Redistribuer, revendre, sous-licencier ou exploiter commercialement les Donnees Indexees obtenues via le Service</li>
                    <li>Constituer des bases de donnees a partir des resultats de recherche a des fins de revente ou de marketing</li>
                  </ul>

                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">5.4 Violations legales</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Toute activite contraire au Reglement General sur la Protection des Donnees (RGPD)</li>
                    <li>Toute activite contraire a la Loi n°78-17 du 6 janvier 1978 relative a l'informatique, aux fichiers et aux libertes</li>
                    <li>Toute activite contraire au Code penal, notamment les articles 226-16 a 226-24 relatifs aux atteintes aux droits de la personne</li>
                    <li>Toute autre activite illegale au regard du droit francais ou du droit applicable dans le pays de residence de l'Utilisateur</li>
                  </ul>

                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">5.5 Atteintes au Service</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Tenter de contourner les limitations techniques du Service (rate limiting, quotas)</li>
                    <li>Utiliser des robots, scripts ou outils automatises non autorises pour acceder au Service</li>
                    <li>Surcharger intentionnellement l'infrastructure du Service</li>
                    <li>Tenter d'acceder a des zones non autorisees du Service ou de ses systemes</li>
                  </ul>
                </section>

                <hr className="border-border/50" />

                <section id="responsabilite-utilisateur" data-testid="section-responsabilite-utilisateur">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Scale className="w-5 h-5 text-primary" />
                    Article 6 — Responsabilite de l'Utilisateur
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">6.1 Usage personnel</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur est seul et unique responsable de l'utilisation qu'il fait du Service et des informations obtenues. Le Service est fourni en tant qu'outil neutre ; l'Utilisateur assume l'entiere responsabilite des consequences de ses actes.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">6.2 Conformite legale</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur s'engage a respecter l'ensemble des lois et reglementations applicables dans le cadre de son utilisation du Service, notamment en matiere de protection des donnees personnelles et de respect de la vie privee.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">6.3 Garantie et indemnisation</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur s'engage a garantir et indemniser le Prestataire, ses dirigeants, employes et partenaires contre toute reclamation, plainte, poursuite, action en justice, condamnation, amende ou sanction resultant de son utilisation du Service en violation des presentes CGU, de la loi applicable, ou de toute atteinte aux droits de tiers.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Cette garantie couvre notamment les dommages et interets, frais de justice, honoraires d'avocats et tous frais raisonnablement engages pour la defense du Prestataire.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="responsabilite-prestataire" data-testid="section-responsabilite-prestataire">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Gavel className="w-5 h-5 text-primary" />
                    Article 7 — Responsabilite du Prestataire
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">7.1 Statut d'intermediaire technique</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Service agit en qualite d'intermediaire technique au sens du Reglement (UE) 2022/2065 relatif aux services numeriques (DSA) et de l'article 6 de la Loi n°2004-575 du 21 juin 2004 pour la confiance dans l'economie numerique (LCEN).
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire n'exerce aucun controle editorial prealable sur les Donnees Indexees et n'effectue aucune selection, modification ou validation du contenu reference.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">7.2 Origine des donnees</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Les Donnees Indexees proviennent exclusivement de fuites de donnees tierces prealablement rendues publiquement accessibles sur Internet. Le Prestataire :
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>N'est pas a l'origine de ces fuites</li>
                    <li>N'a pas participe a l'obtention illicite de ces donnees</li>
                    <li>Ne garantit pas l'exactitude, l'exhaustivite ou l'actualite des informations referencees</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">7.3 Limitation de responsabilite</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Dans les limites autorisees par la loi applicable :</strong>
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Le Service est fourni « en l'etat » et « selon disponibilite », sans garantie d'aucune sorte, expresse ou implicite.</li>
                    <li>Le Prestataire ne garantit pas que le Service sera exempt d'erreurs, d'interruptions ou de failles de securite.</li>
                    <li>Le Prestataire ne saurait etre tenu responsable des dommages indirects, consecutifs, speciaux ou punitifs.</li>
                    <li>La responsabilite totale du Prestataire est limitee aux sommes effectivement versees par l'Utilisateur au cours des douze (12) mois precedant le fait generateur du dommage, ou a cent (100) euros si aucune somme n'a ete versee.</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">7.4 Force majeure</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire ne saurait etre tenu responsable de l'inexecution de ses obligations resultant d'un cas de force majeure tel que defini par l'article 1218 du Code civil et la jurisprudence des tribunaux francais.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="donnees" data-testid="section-donnees">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-primary" />
                    Article 8 — Donnees personnelles
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">8.1 Traitement des donnees des Utilisateurs</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Dans le cadre du fonctionnement du Service, le Prestataire collecte et traite certaines donnees personnelles des Utilisateurs :
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Identifiants de compte (nom d'utilisateur, mot de passe hashe)</li>
                    <li>Donnees de connexion (adresse IP, user agent, horodatage)</li>
                    <li>Historique des recherches effectuees</li>
                    <li>Donnees de facturation pour les services payants</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">8.2 Donnees Indexees</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Concernant les Donnees Indexees provenant de fuites tierces, le Prestataire agit en qualite d'intermediaire technique referencant des informations deja publiquement accessibles.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="demandes" data-testid="section-demandes">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Mail className="w-5 h-5 text-primary" />
                    Article 9 — Demandes relatives aux donnees indexees
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">9.1 Procedure de demande</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Toute personne souhaitant exercer ses droits concernant des donnees la concernant apparaissant dans les resultats de recherche peut adresser une demande a l'adresse : <strong className="text-primary">contact@discreen.fr</strong>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">La demande doit inclure :</p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Preuve d'identite du demandeur</li>
                    <li>Description precise des donnees concernees</li>
                    <li>Motif de la demande</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">9.2 Examen des demandes</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Conformement a l'article 17 du RGPD, le droit a l'effacement n'est pas absolu. Chaque demande sera examinee individuellement.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">Le Prestataire peut refuser une demande d'effacement lorsque le traitement est necessaire :</p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>A l'exercice du droit a la liberte d'expression et d'information</li>
                    <li>A des fins de recherche scientifique ou a des fins statistiques</li>
                    <li>A la constatation, a l'exercice ou a la defense de droits en justice</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">9.3 Delai de reponse</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire s'engage a repondre aux demandes dans un delai d'un (1) mois a compter de leur reception. Ce delai peut etre prolonge de deux (2) mois supplementaires compte tenu de la complexite de la demande.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="propriete" data-testid="section-propriete">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    Article 10 — Propriete intellectuelle
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">10.1 Droits du Prestataire</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Service, incluant son architecture, son code source, son interface graphique, ses bases de donnees techniques et sa documentation, est protege par les lois relatives a la propriete intellectuelle.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur se voit accorder une licence d'utilisation personnelle, non exclusive, non transferable et revocable pour acceder au Service conformement aux presentes CGU.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">10.2 Restrictions</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">L'Utilisateur s'interdit de :</p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Copier, modifier, adapter ou creer des oeuvres derivees du Service</li>
                    <li>Decompiler, desassembler ou proceder a l'ingenierie inverse du Service</li>
                    <li>Supprimer ou alterer les mentions de propriete intellectuelle</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">10.3 Donnees Indexees</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Les Donnees Indexees proviennent de sources tierces. Le Prestataire ne revendique aucun droit de propriete sur ces donnees et ne garantit pas que leur utilisation par l'Utilisateur ne porte pas atteinte aux droits de tiers.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="suspension" data-testid="section-suspension">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    Article 11 — Suspension et resiliation
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">11.1 Suspension immediate</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire se reserve le droit de suspendre immediatement et sans preavis l'acces au compte de tout Utilisateur en cas de :
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Violation grave des presentes CGU, notamment des articles 4 et 5</li>
                    <li>Activite illicite averee ou suspectee</li>
                    <li>Atteinte a la securite ou a l'integrite du Service</li>
                    <li>Fraude au paiement</li>
                    <li>Demande d'une autorite judiciaire ou administrative competente</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">11.2 Mise en demeure prealable</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Pour les manquements mineurs aux CGU, le Prestataire adressera une mise en demeure a l'Utilisateur lui accordant un delai de quinze (15) jours pour regulariser sa situation avant toute suspension.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">11.3 Resiliation par l'Utilisateur</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur peut resilier son compte a tout moment depuis son espace personnel ou en contactant le support.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">11.4 Effets de la resiliation</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">La resiliation entraine :</p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>La suppression de l'acces au Service</li>
                    <li>La conservation des donnees de l'Utilisateur pendant trente (30) jours pour permettre leur recuperation</li>
                    <li>La suppression definitive des donnees a l'issue de ce delai, sauf obligation legale de conservation</li>
                  </ul>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">11.5 Survie des clauses</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Les articles 6, 7, 10 et 13 survivent a la resiliation des presentes CGU.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="modification" data-testid="section-modification">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    Article 12 — Modification des CGU
                  </h2>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">12.1 Evolution des conditions</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Le Prestataire se reserve le droit de modifier les presentes CGU a tout moment pour les adapter aux evolutions du Service ou aux exigences legales.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">12.2 Information des Utilisateurs</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Toute modification substantielle sera notifiee aux Utilisateurs par email ou notification dans l'interface du Service au moins trente (30) jours avant son entree en vigueur.
                  </p>
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">12.3 Acceptation ou refus</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    L'Utilisateur dispose du delai de preavis pour accepter ou refuser les nouvelles conditions. En cas de refus, l'Utilisateur peut resilier son compte sans frais avant l'entree en vigueur des modifications.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    La poursuite de l'utilisation du Service apres l'entree en vigueur des modifications vaut acceptation des nouvelles CGU.
                  </p>
                </section>

                <hr className="border-border/50" />

                <section id="droit" data-testid="section-droit">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
                    <Gavel className="w-5 h-5 text-primary" />
                    Article 13 — Droit applicable et juridiction
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Les presentes CGU sont regies par le droit francais. En cas de litige, les parties s'engagent a rechercher une solution amiable avant toute action judiciaire. A defaut d'accord amiable, les tribunaux competents seront ceux du ressort du siege social du Prestataire.
                  </p>
                </section>

              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
