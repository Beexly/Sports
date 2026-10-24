# Biophysical Telemetry and Regularity Audit

Source: Biophysical Telemetry and Regularity Audit.docx

Mathematical and Biophysical Foundations of Subclinical Neurodegenerative Detection and Navier-Stokes Regularity

Executive Verdict

The three-dimensional incompressible Navier-Stokes Millennium Prize problem remains strictly UNSOLVED as of October 2026. No mathematical proof of global existence and smoothness or finite-time singularity has survived peer review. The Clay Mathematics Institute official formulation requires proving global regularity or smooth blowup. Energy conservation operates in a supercritical Sobolev regime that fails to prevent finite-time enstrophy collapse. Any cross-domain claim asserting that Navier-Stokes equations resolve acoustic dementia detection is physically unfounded. In subclinical neurodegeneration, macroscopic cognitive screening batteries fail due to compensatory cognitive reserve. Digital pen graphomotor kinematics reliably capture micro-motor latencies, while curvature power law drift is extrapyramidal. Persistent homology on stroke point clouds remains theoretically sound but unvalidated in published clinical patient cohorts. Speech pause duration, hesitation ratios, and articulation rates replicate across corpora, whereas vocal attractor dimensions do not. A Spanish-cohort speech clock shows association with plasma p-tau217 (r = 0.18) without establishing causal prediction. Semantic fluency graphs cannot identify critical percolation thresholds from brief clinical fifteen-word samples. Wiener drift-diffusion accumulation is mathematically misspecified when applied to total Trail Making Test completion times. Longitudinal jump-diffusion models are unidentified under annual imaging, and conformal guarantees require exchangeability. Continuum Navier-Stokes formulations fail at the microvascular scale due to erythrocyte particulate mechanics. Commercial digital tools operate under Class II computerized cognitive aid exemptions, not as cleared diagnostic devices.

Lane A: Digital Biophysical Detection of Prodromal Neurodegeneration

Probe A1: Clock-Drawing and Graphomotor Kinematics

Governing Equations and Hypotheses

Let planar hand movements during drawing be parameterized as a smooth planar curve \mathbf{r}(t) = (x(t), y(t))^\top \in C^3([0, T], \mathbb{R}^2). The instantaneous tangential speed is v(t) = \|\mathbf{r}'(t)\|_2 = \sqrt{x'(t)^2 + y'(t)^2}, and the Euclidean path curvature is given by:

\kappa(t) = \frac{|x'(t)y''(t) - x''(t)y'(t)|}{(x'(t)^2 + y'(t)^2)^{3/2}}

Under the hypothesis of cortical equi-affine isochrony, healthy motor planning optimizes movement smoothness along an affine invariant metric space, leading to the constrained kinematic two-thirds power law:

v(t) = \gamma \kappa(t)^{-\beta}, \quad \text{equivalently} \quad \omega(t) = C \kappa(t)^{2/3}

where \omega(t) = v(t)\kappa(t) represents angular speed, \gamma is a piecewise constant velocity gain factor, and \beta \approx 1/3. The foundational biomechanical theory posits that movement segments minimize the dynamic jerk functional over a finite trajectory duration [0, T]:

\mathcal{J} = \int_{0}^{T} \left\| \frac{d^3 \mathbf{r}(t)}{dt^3} \right\|_2^2 dt = \int_{0}^{T} \left( x'''(t)^2 + y'''(t)^2 \right) dt

with endpoint conditions \mathbf{r}(0) = \mathbf{r}_0, \mathbf{r}(T) = \mathbf{r}_f, and vanishing velocity and acceleration at the boundaries \mathbf{r}'(0) = \mathbf{r}'(T) = \mathbf{0}, \mathbf{r}''(0) = \mathbf{r}''(T) = \mathbf{0}. To enable rigorous inter-subject normalization invariant to movement amplitude L and execution duration T, the dimensionally normalized jerk is computed as:

NJ = \frac{T^5}{L^2} \int_{0}^{T} \|\mathbf{r}'''(t)\|_2^2 \, dt

Estimator

The digital stream S = \{(x_i, y_i, t_i, p_i)\}_{i=1}^N is acquired at discrete intervals \Delta t_i = t_i - t_{i-1} \approx 8\text{--}12\,\text{ms}, where p_i represents digitizer pen tip pressure. Pen-up intervals (p_i = 0) define inter-stroke latency boundaries and are isolated as cognitive planning epochs. Discrete coordinates are filtered using a quintic smoothing spline with generalized cross-validation or a third-order Savitzky-Golay polynomial filter across a 40\,\text{ms} window to prevent noise explosion under numerical differentiation. Curvature \kappa_i and velocity v_i are evaluated at all points satisfying v_i \ge v_{\min} = 1.5\,\text{mm/s} to avoid cusp singularities. The exponent \hat{\beta} is estimated via weighted least-squares regression over logarithmic coordinates, weighted by local arc-length dwell time \Delta s_i = v_i \Delta t_i:

\ln v_i =[span_66](start_span)[span_66](end_span) \ln \hat{\gamma} - \hat{\beta} \ln \kappa_i + \varepsilon_i

Spatial digit placement organization is quantified via digit angular entropy. The clock face centroid (\bar{x}, \bar{y}) is extracted, radial angles \theta_k = \arctan2(y_k - \bar{y}, x_k - \bar{x}) \in [0, 2\pi) are calculated for all twelve digit bounding box centers, and the sorted angles \theta_{(1)} \le \theta_{(2)} \le \dots \le \theta_{(12)} yield angular intervals \Delta \theta_k = \theta_{(k+1)} - \theta_{(k)} (with \theta_{(13)} = \theta_{(1)} + 2\pi). Normalized Shannon entropy over the empirical angular spacing distribution is defined as:

H_\theta [span_69](start_span)[span_69](end_span)= -\sum_{k=1}^{12} \left(\frac{\Delta \theta_k}{2\pi}\right) \ln \left(\frac{\Delta \theta_k}{2\pi}\right)

Sample-Size and Signal-Quality Floor

The estimator is mathematically unidentified if the digitizer sampling rate falls below 100\,\text{Hz} (\Delta t > 10\,\text{ms}), as resolving physiological micro-tremor (4\text{--}12\,\text{Hz}) and ballistic sub-movement peaks requires a post-filter Nyquist rate of at least 100\,\text{Hz}. Pressure resolution requires a minimum of 10\text{-bit} encoding (1024 discrete pressure levels); lower resolutions introduce step discontinuities into contact boundary estimation. A valid session requires at least 500 valid pen-down samples across at least 5 distinct stroke trajectories, and drawing time must exceed 5.0\,\text{s}. Incomplete drawings representing less than 50\% of an enclosed contour fail closed and emit an abstention.

Best Human Evidence

In the digital Clock Drawing Test (dCDT / DCTclock) literature, including validations within the Framingham Heart Study (n = 2,416) and the Harvard Aging Brain Study (n = 169), total completion time differentiates clinically diagnosed dementia from controls with an Area Under the Curve (\text{AUC}) of 0.82\text{--}0.86. In preclinical cohorts, the spatial reasoning and drawing efficiency kinematic subscores differentiated amyloid-positive (\text{A}\beta^+) older adults from amyloid-negative (\text{A}\beta^-) controls (\text{AUC} = 0.69\text{--}0.74, p < 0.005). Incremental validity over total completion time is driven primarily by pen-up latency (which accounts for up to 75\% of total test duration in impaired subjects), velocity coefficient of variation (\text{CV}_v = \sigma_v / \mu_v), and digit angular entropy H_\theta, whereas purely geometric contour metrics (such as circularity error) show negligible predictive power.

Verification of Power Law Exponent Drift: Alzheimer's vs. Parkinson's

Systematic drift of the power law exponent \beta away from 1/3 is classified as ESTABLISHED for Parkinson's disease and dopaminergic challenge, but THEORETICAL for Alzheimer's disease. In extrapyramidal movement disorders and pharmacological dopamine receptor blockade, basal ganglia dysfunction disrupts the striatal motor networks that govern affine velocity-curvature scaling. Conversely, in prodromal Alzheimer's disease, drawing strokes retain local kinematic isochrony during active surface contact. Pathological impairment in Alzheimer's disease localizes to prefrontal and parietal planning intervals, manifesting as prolonged pen-up decision pauses, initiation hesitation, and spatial digit crowding, rather than a breakdown of the kinematic power law exponent.

Persistent Homology on Stroke Point Clouds

Persistent homology computed directly on digitizer pen stroke point clouds in clinical patient cohorts is classified as THEORETICAL and NOT FOUND in peer-reviewed clinical validation studies. Vietoris-Rips filtrations \mathcal{VR}(S, \epsilon) constructed over stroke coordinate point clouds S \subset \mathbb{R}^3 yield persistence diagrams whose Bottleneck and Wasserstein distances are mathematically stable under Hausdorff perturbations. However, clinical studies deploying persistent homology in Alzheimer's disease evaluate neuroimaging connectivity matrices or functional hemodynamic signals, rather than raw digitizer trajectory point clouds.

Strongest Negative Result

In asymptomatic preclinical cohorts with molecular amyloid imaging, global clock drawing kinematic composites show no statistically significant cross-sectional correlation with cortical amyloid burden once chronological age, sex, and educational attainment are controlled for in multivariable regression models (p = 0.12\text{--}0.28). Kinematic metrics fail to reliably distinguish early amnestic mild cognitive impairment from normal controls without paired episodic memory tasks.

Confounders

Action and postural tremor (4\text{--}8\,\text{Hz}) and physiological tremor (8\text{--}12\,\text{Hz}) elevate the normalized jerk functional and velocity variance independently of cognitive status. Peripheral mechanical arthritis and diabetic motor neuropathy increase contact duration and alter pen-down pressure profiles. Educational background and premorbid drawing experience influence spatial organization and baseline digit placement. Variations in tablet hardware digitizer technology and screen friction coefficients shift velocity-curvature scaling constants by up to 18\%.

Conversion and Molecular Biomarker Prediction Beyond Demographics

In the Anti-Amyloid Treatment in Asymptomatic Alzheimer's (A4) Study screening dataset, digital clock drawing spatial-reasoning kinematic subscores explained a statistically significant incremental variance (\Delta R^2 \approx 0.03\text{--}0.05, p < 0.01) in cortical amyloid PET Centiloids beyond age and education. Digital drawing kinematics do not replace fluid or molecular PET biomarkers.

Probe A2: Speech Timing and Phonatory Dynamics

Governing Equations and Hypotheses

Acoustic speech signals s(t) represent glottal volume velocity airflow filtered by the vocal tract acoustic transfer function:

s(t) = u_g(t) * h_{\text{tract}}(t) * r_{\text{radiation}}(t)

Connected speech timing partitions total utterance time T_{\text{total}} into voiced phonation T_{\text{voiced}}, unvoiced intervals T_{\text{unvoiced}}, and silent pauses T_{\text{pause}} = \sum_{k=1}^{N_p} \Delta t_{p,k}, where silent pause events satisfy \Delta t_{p,k} \ge \theta_{\text{pause}} = 250\,\text{ms}. The primary macro-timing metrics are defined as:

$$\text{Pause Ratio} = \frac{\sum_{k} \Delta t_{p,k}}{T_{\text{total}}}, \quad \text{Articulation Rate} = \frac{N_{\text{syllables}}}{T_{\text{voiced}} + T_{\text{unvoiced}}}[span_77](start_span)[span_77](end_span)

\text{Hesitation Ratio} = \frac{T_{\text{pause}} + T_{\text{filled pauses}}}{T_{\text{total}}}

The nonlinear dynamical phonation hypothesis assumes that sustained vocal fold oscillation originates from a deterministic low-dimensional nonlinear attractor whose phase space is reconstructed from a discrete acoustic pressure series s_n = s(n \Delta t) using Takens' Delay-Coordinate Embedding Theorem:

\mathbf{x}_n = \left( s_n, s_{n+\tau}, s_{n+2\tau}, \dots, s_{n+(m-1)\tau} \right)^\top \in \mathbb{R}^m

The embedding delay \tau is chosen as the first local minimum of the Average Mutual Information, and the embedding dimension m is selected where the fraction of False Nearest Neighbors falls below 0.01. The Maximal Lyapunov Exponent \lambda_1 measures the mean divergence rate of adjacent trajectories:

\lambda_1 = \lim_{t \to \infty} \lim_{\|\Delta \mathbf{x}(0)\| \to 0} \[span_79](start_span)[span_79](end_span)frac{1}{t} \ln \frac{\|\Delta \mathbf{x}(t)\|}{\|\Delta \mathbf{x}(0)\|}

Multiscale Sample Entropy (MSE) coarse-grains s_n across temporal scale factors \ell \in \{1, \dots, \tau_{\max}\}:

y_j^{(\ell)} = \frac{1}{\ell} \sum_{i=(j-1)\ell + 1}^{j\ell} s_i, \quad 1 \le j \le \lfloor N/\ell \rfloor \text{SampEn}(\ell, m_{\text{se}}, r) = -\ln \frac{A^{(\ell)}[span_81](start_span)[span_81](end_span)(r)}{B^{(\ell)}(r)}

where B^{(\ell)}(r) denotes the probability of vector matching of length m_{\text{se}} within tolerance r = 0.15 \times \text{SD}(s), and A^{(\ell)}(r) is the probability of matching of length m_{\text{se}}+1. Recurrence Quantification Analysis (RQA) evaluates the recurrence matrix R_{i,j}(\varepsilon) = \Theta(\varepsilon - \|\mathbf{x}_i - \mathbf{x}_j\|_2) across a Theiler window w \ge \tau, deriving Determinism (DET), Laminarity (LAM), and Trapping Time (TT):

\text{DET} = \frac{\sum_{l \ge l_{\min}} l P(l)}{\sum_{i,j} R_{i,j}}, \quad \text{LAM} = \frac{\sum_{v \ge v_{\min}} v P(v)}{\sum_{v} v P(v)}, \quad \text{TT} = \frac{\sum_{[span_83](start_span)[span_83](end_span)v \ge v_{\min}} v P(v)}{\sum_{v \ge v_{\min}} P(v)}

Estimator

Acoustic speech frames are segmented into voiced, unvoiced, and silent components using energy-based Voice Activity Detection and spectral flux tracking. Pauses are classified as silent if duration exceeds 250\,\text{ms}, while vocalized filled pauses ("um", "ah") are captured through automated phonemic alignment. Standard linear acoustic metrics (jitter, shimmer, Harmonics-to-Noise Ratio) are extracted exclusively from stable voiced vowels.

Sample-Size and Signal-Quality Floor

Sustained vowel tasks require a minimum of 2.0\,\text{s} of continuous phonation sampled at f_s \ge 16\,\text{kHz} with 16\text{[span_86](start_span)[span_86](end_span)-bit} linear quantization, an acoustic Signal-to-Noise Ratio (\text{SNR}) \ge 20\,\text{dB}, and a voiced fraction \ge 60\%. Connected speech tasks (such as the Cookie Theft picture description) require at least 30\,\text{s} of continuous audio containing \ge 15\,\text{s} of active vocalization and \ge 50 recognized words. Audio sampled below 8\,\text{kHz} or containing uncalibrated clipping (>1\% clipped frames) fails closed and is rejected.

Best Human Evidence

Across the DementiaBank Pitt Corpus (n = 292 sessions; 167 probable Alzheimer's disease, 97 healthy controls) and the standardized ADReSS challenge benchmark (n = 156), acoustic timing features reliably differentiate Alzheimer's disease from controls. Pause ratio, hesitation frequency, and speech rate demonstrate large effect sizes (Cohen's d = 0.72\text{--}0.88, p < 0.001). In the competitive ADReSS benchmark, acoustic-only models reached test-set classification \text{AUC} values of 0.76\text{--}0.79, while multimodal acoustic-plus-linguistic models achieved \text{AUC} = 0.86\text{--}0.89.

The primary nonlinear acoustic and recurrence metrics are summarized in the following table, indicating their empirical validation status across clinical cohorts:

Metric

Literature Cohort

Primary Clinical Result

Replication Status in Alzheimer's Disease

Maximal Lyapunov Exponent (\lambda_1)

Organic dysphonia, Parkinson's disease

Increased in vocal fold paralysis and hypokinetic dysarthria (d = 0.81)

ABSENT. Unidentified on conversational speech; fails closed.

Correlation Dimension (D_2)

Vocal fold polyps, unilateral laryngeal paralysis

Differentiates organic structural pathology from normal limit cycles

ABSENT. No demonstrated diagnostic utility in prodromal Alzheimer's disease.

Multiscale Sample Entropy (MSE)

Resting-state EEG/fMRI; sustained vowel phonation

Demonstrates loss of dynamical complexity across coarse temporal scales

SINGLE-COHORT. Observed in sustained vowels; secondary to pause ratios.

RQA (DET, LAM, TT)

Hyperfunctional dysphonia, Parkinsonian phonation

Elevated laminarity and trapping time indicate sustained vocal tract rigidity

THEORETICAL. Unreplicated in subclinical Alzheimer's disease.

Verification of Speech Clocks and Plasma p-tau217

The claimed 2026 Science Advances publication is verified, resolving via DOI 10.1126/sciadv.aef9864 (PubMed PMID 42814823) under the citation: Hernan Hernandez, Lizeth Katherine Pedraza, Hernando Santamaria-Garcia, Sebastian Moguilner, Agustina Legaz, Adolfo M. García, Agustin Ibanez, et al. (2026), "Speech clocks decode dementia phenotypes, social exposome, and biological aging," Science Advances, 12(40), eaef9864. The study evaluated a cross-sectional multicenter cohort of n = 2,928 native Spanish speakers across five Latin American countries (Argentina, Chile, Colombia, Mexico, Peru), comprising healthy controls, Mild Cognitive Impairment, Alzheimer's disease, and frontotemporal dementia variants. Multimodal acoustic and linguistic models estimated chronological age, generating an individualized Speech Age Gap (\text{SAG} = \text{Predicted Age} - \text{Chronological Age}).

In participants with Alzheimer's disease, an elevated SAG was significantly associated with circulating plasma phosphorylated tau-217 (\text{p-tau217}). However, the within-group correlation was modest (r =[span_237](start_span)[span_237](end_span)[span_245](start_span)[span_245](end_span) 0.18, p < 0.05). The study authors explicitly document that the investigation was cross-sectional, precluding causal inference or direct estimation of within-person longitudinal disease progression. Furthermore, the model was trained exclusively on Spanish-language vocal and syntactic structures; generalization to other linguistic families without parameter recalibration remains unverified.

Audio Degradation Failure Modes

Telephony bandwidth restrictions (8\,[span_238](start_span)[span_238](end_span)[span_246](start_span)[span_246](end_span)\text{kHz} sampling rate) eliminate acoustic energy above 3.4\text{--}4.0\,\text{kHz}, destroying upper formants (F_3, F_4) and fricative consonant spectral distributions, which invalidates vocal tract dispersion and Harmonics-to-Noise Ratio calculations. Lossy perceptual audio compression (e.g., AMR, MP3) quantizes sub-threshold spectral components, introducing artificial phase-space structures that distort Takens delay embeddings and artificially deflate sample entropy. Uncontrolled domestic ambient noise (\text{SNR} < 12\,\text{dB}) degrades voice activity detection, causing false pause boundary insertions or masking true short cognitive pauses (250\text{--}500\,\text{ms}), altering pause ratio measurements by up to 45\%.

Strongest Negative Result

Acoustic classifiers trained on single-site recording data drop from high apparent accuracy (\text{AUC} > 0.88) to near-chance levels (\text{AUC} \approx 0.56\text{--}0.62) when evaluated on external corpora recorded with different microphone hardware and room acoustics, proving that unstandardized acoustic features capture hardware channel characteristics rather than neurological disease.

Confounders

Age-related sensorineural hearing loss degrades auditory feedback, inducing compensatory changes in speech volume and slowing articulation rate. Anticholinergic medications cause xerostomia (dry mouth), producing acoustic phonatory instability and irregular vocal fold contact. Clinical depression introduces psychomotor slowing, flat prosody, and extended response latencies that mimic cognitive pause profiles. Regional dialectal cadence and educational attainment govern baseline lexical access and syntactic complexity.

Conversion and Fluid Biomarker Prediction Beyond Demographics

In epidemiological cohorts from the Framingham Heart Study, composite acoustic timing measures (pause duration and hesitation ratios) provided an incremental hazard ratio (\text{HR} = 1.31, 95\%\,\text{CI}: [1.08, 1.58], p = 0.006) for predicting prospective conversion from normal cognition to dementia over 5 years of follow-up after adjusting for baseline age, sex, education, and APOE \varepsilon4 genotype.

Probe A3: Semantic and Lexical Networks from Verbal Fluency

Governing Equations and Hypotheses

In a category verbal fluency task (e.g., generating animal names in 60\,\text{s}), the output is an ordered sequence of lemmatized words W = (w_1, w_2, \dots, w_K). The human semantic mental lexicon is modeled as a connected graph G = (V, E, \mathbf{W}), where vertices V represent semantic concepts (\vert{}V\vert{} = N) and edge weights w_{ij} \in [0, 1] represent semantic association strength derived from corpus embedding cosine similarity:

w_{ij} = \cos([span_104](start_span)[span_104](end_span)\mathbf{e}_i, \mathbf{e}_j) = \frac{\mathbf{e}_i^\top \mathbf{e}_j}{\|\mathbf{e}_i\|_2 \|\mathbf{e}_j\|_2}

or empirical free-association norms. Network degradation is modeled using bond percolation, where edges are retained with probability p \in [0, 1] and deleted with probability 1 - p. The order parameter is the relative size of the giant connected component S(p) = |V_{\text{giant}}| / N. Near the critical percolation threshold p_c, scaling obeys:

S(p) \propto (p - p_c)^\beta \quad \text{for } p \to p_c^+

The percolation integral \Phi_G = \int_{0}^{1} S(p) \, dp quantifies global structural network robustness across all retention thresholds. Global graph cohesion is measured via the normalized graph Laplacian \mathcal{L} = \mat[span_109](start_span)[span_109](end_span)hbf{D}^{-1/2} (\mathbf{D} - \mathbf{A}) \mathbf{D}^{-1/2}, whose spectrum satisfies 0 = \lambda_1 \le \lambda_2 \le \dots \le \lambda_N \le 2. The second eigenvalue, \lambda_2(\mathcal{L}), represents the algebraic connectivity (Fiedler eigenvalue):

\lambda_2(\mathcal{L}) = \min_{\substack{\mathbf{x} \perp \mathbf{D}^{1/2}\mathbf{1} \\ \mathbf{x} \neq \mathbf{0}}} \frac{\mathbf{x}^\top (\mathbf{D} - \mathbf{A}) \mathbf{x}}{\math[span_111](start_span)[span_111](end_span)bf{x}^\top \mathbf{D} \mathbf{x}}

A decay in \lambda_2 reflects topological modular fragmentation and increased network bottlenecking. Search dynamics on G are formulated as a Random Walk with Restart (RWR):

\boldsymbol{\pi}_{t+1} = (1 - \alpha) \mathbf{P}^\top \boldsymbol{\pi}_t + \alpha \boldsymbol{\pi}_0

where \mathbf{P} = \mathbf{D}^{-1}\mathbf{A} is the Markov transition matrix and \alpha \in (0, 1) is the restart probability. Transitions between distinct semantic subcategories correspond to community crossings identified via modularity maximization.

Mathematical Identifiability of Single-Subject Critical Probability p_c

A single subject producing a 15-word verbal fluency list cannot identify an individualized critical percolation threshold p_c, rendering single-subject percolation estimation mathematically unidentified. Percolation threshold p_c is an asymptotic phase-transition property defined on infinite lattices or large random networks as N \to \infty. On a finite subgraph induced by K \approx 15 observed words, the maximum possible number of edges is \binom{15}{2} = 105. The finite-size scaling rounding width of the percolation transition scales as \Delta p \sim K^{-1/\nu}. For complex or scale-free networks where the correlation length critical exponent is \nu \approx 0.8\text{--}1.3, a sample of K = 15 produces a transition rounding width of \Delta p \sim 15^{-1/1.3} \approx 0.12\text{--}0.25. This finite-size broadening exceeds the entire empirical difference observed between control and pathological networks. Furthermore, the 15 words represent a sparse, non-stationary temporal sample of a latent lexicon containing tens of thousands of concepts, reflecting executive retrieval strategies rather than the physical percolation properties of the global semantic network.

Clustering, Switching, and Incremental Validity

Extracting semantic clusters and cluster switches yields established incremental validity over raw word counts. Mean cluster size reflects temporal lobe semantic store integrity and is significantly reduced in Alzheimer's disease (Cohen's [span_119](start_span)[span_119](end_span)d = -0.58, p < 0.001). The number of cluster switches reflects frontal executive search and cognitive flexibility, showing severe reductions in frontotemporal lobar degeneration and Parkinson's disease (d = -0.84) even when cluster size remains intact. Combining cluster metrics with raw total word counts increases classification accuracy from \text{AUC} = 0.71 to \text{AUC} = 0.81 when differentiating MCI from normal aging.

Strongest Negative Result

When semantic network graphs are constructed purely from text embedding cosine similarities without controlling for word frequency, network topology metrics (clustering coefficient and average shortest path length) fail to provide statistically significant improvements over a simple multivariable regression model incorporating demographic factors and raw word count (p = 0.38).

Confounders

Premorbid vocabulary knowledge and years of education heavily inflate semantic network node count and edge density. Bilingualism alters semantic clustering dynamics, generating apparent cluster switches driven by cross-linguistic lexical competition. Depressive apathy reduces executive persistence, causing premature retrieval termination that mimics network fragmentation.

Biomarker Prediction Beyond Demographics

Semantic clustering and switching scores correlate with left temporal lobe cortical thickness and Fluorodeoxyglucose (\tex[span_124](start_span)[span_124](end_span)t{FDG}) PET hypometabolism in the angular gyrus, but do not independently predict brain amyloid PET Centiloids after adjusting for global cognitive composites.

Probe A4: Decision Models of Latency

Governing Equations and Hypotheses

In a two-alternative forced-choice (2AFC) task, evidence accumulation toward decision boundaries is modeled via a continuous one-dimensional Wiener Drift-Diffusion Process:

dX_t = v dt + \sigma dW_t, \qu[span_126](start_span)[span_126](end_span)ad X_0 = z, \quad 0 < z < a

where v is the mean drift rate (evidence processing efficiency), \sigma is the diffusion coefficient representing within-trial noise (conventionally fixed to \sigma = 1.0), a > 0 is threshold separation (decision caution), z \in (0, a) is starting point bias, and W_t is a standard Wiener process. Observed reaction time (RT) is the sum of the decision first-passage time (FPT) and non-decision time T_{er} (sensory encoding and motor execution latency):

RT = FPT + T_{er}, \quad T_{er} \sim \mathcal{U}\left(t_0 - \frac{s_t}{2}, t_0 + \frac{s_t}{2}\right) \text{ or } \mathcal{N}(\m[span_128](start_span)[span_128](end_span)u_{T_{er}}, \sigma_{T_{er}}^2)

The analytical probability density function for First-Passage Time crossing the upper boundary a at decision time t possesses two mathematically equivalent series expansions derived by Navarro and Fuss (2009):

The large-time series expansion (stable for t > \frac{a^2}{\pi^2 \sigma^2}) is formulated as:

f_+(t; a, v, z, \sigma) = \frac{\pi \sigma^2}{a^2} \exp\left( \frac{v(a-z)}{\sigma^2} - \frac{v^2 t}{2\sigma^2} \right) \sum_{k=1}^{\infty} k \sin\left(\frac{k \pi (a-z)}{a}\right) \exp\left( -\frac{k^2 \pi^2 \sigma^2 t}{2a^2} \right)

The small-time series expansion (derived via the method of images, stable for t < \frac{a^2}{\pi^2 \sigma^2}) is formulated as:

f_+(t; a, v, z, \sigma) = \frac{1}{\sqrt{2\pi \sigma^2 t^3}} \exp\left( \frac{v(a-z)}{\sigma^2} - \frac{v^2 t}{2\sigma^2} \right) \sum_{k=-\infty}^{\infty} (a - z + 2ka) \exp\left( -\frac{(a - z + 2ka)^2}{2\sigma^2 t} \right)

Numerical stability is maintained by evaluating the crossover threshold t_{\text{switch}} = \frac{a^2}{\pi^[span_276](start_span)[span_276](end_span)2 \sigma^2}. For t < t_{\text{switch}}, the small-time expansion converges to machine precision (\varepsilon < 10^{-12}) in 1\text{--}3 terms, whereas the large-time formulation requires hundreds of terms. Conversely, for t > t_{\text{switch}}, the large-time expansion converges within 1\text[span_278](start_span)[span_278](end_span){--}4 terms.

Parameter Mapping in Hierarchical Drift-Diffusion Models (HDDM)

Hierarchical Bayesian estimation of drift-diffusion parameters shows consistent alterations across healthy aging and neurodegenerative syndromes:

Clinical Population

Drift Rate (v)

Boundary Separation (a)

Non-Decision Time (T_{er})

Cognitive Paradigm

Healthy Aging

Mild reduction

Significant elevation (elevated caution)

Moderate prolongation

Perceptual 2AFC, Lexical Decision

Mild Cognitive Impairment

Moderate reduction (d = -0.45)

Preserved or elevated

Mild prolongation (d = 0.40)

Recognition Memory, Flanker Task

Alzheimer's Disease

Severe reduction (d = -0.85)

Reduced or uncalibrated

Severe prolongation (d = 0.78)

Visual Search 2AFC, Go/No-Go

Lewy Body Dementia

Severe reduction (d = -1.20[span_131](start_span)[span_131](end_span))

Preserved

Severe prolongation + high variance

Attention 2AFC, Spatial Cueing

On attention tasks, patients with Lewy body dementia display significantly lower drift rates (v) and higher trial-to-trial drift variability than patients with Alzheimer's disease, reflecting fluctuating vigilance.

Trail Making Test Modeling Misspecification

Fitting a standard two-boundary Drift-Diffusion Model to total completion time on the Trail Making Test (TMT-A or TMT-B) is mathematically misspecified. The Trail Making Test does not constitute a single two-alternative forced choice; it is an extended sequential visual search, task-switching, and graphomotor reaching task consisting of 24 distinct node-to-node transitions. Total completion time represents a sum of dependent first-passage times, saccadic search latencies, and motor reaching trajectories, complicated by error-correction loops:

T_{\text{total}} = \sum_{i=1}^{24} \left( FPT_i + T_{\text{saccade},i} + T_{\text{reach},i} \right) + \sum_{k=1}^{N_{\text{errors}}} T_{\text{correction},k}

Fitting a single 1D Wiener density to T_{\text{total}} violates the absorbing boundary Markov assumptions of the diffusion model, yielding uninterpretable parameter estimates where drift rate and boundary separation lose theoretical validity. Discrete timestamp logging at each circle transition is required to identify sub-decision parameters.

White Matter Hyperintensities (WMH) and Drift Rate

White matter hyperintensity volume correlates inversely with drift rate v on processing speed tasks (r = -0.28\text{--}-0.35, p < 0.01), classified as a SINGLE-COHORT empirical association. Upgrading this correlation to an exclusive causal mechanism is unsupported: cortical amyloid deposition and tau neurofibrillary tangles also induce axonal disconnection and reduce drift rate v independently of vascular damage.

Confounders

Peripheral motor arthritis inflates non-decision time T_{er} without altering drift rate v. Performance anxiety increases boundary separation a. Visual acuity loss or cataracts prolong stimulus encoding within T_{er}.

Probe A5: Longitudinal Latent Disease Progression Models

Governing Equations and Hypotheses

Let C_i(t) \in \m[span_142](start_span)[span_142](end_span)athbb{R} denote the latent cognitive disease state of individual i at time t. The continuous disease progression is modeled as a mean-reverting Ornstein-Uhlenbeck process coupled with compound Poisson jumps:

d C_i(t) = -\theta \left( C_[span_145](start_span)[span_145](end_span)i(t) - \mu_i(t; \mathbf{x}_i) \right) dt + \sigma_c dW_i(t) + \sum_{j=1}^{N_i(t)} J_{ij}

where \theta > 0 represents the mean-reversion rate toward an individual baseline trajectory \mu_i(t; \mathbf{x}_i[span_146](start_span)[span_146](end_span)), \sigma_c > 0 is continuous Brownian volatility, W_i(t) is standard Brownian motion, N_i(t) is a Poisson counting process with intensity \lambda(t), and J_{ij} \sim \mathcal{N}(\mu_J, \sigma_J^2) represents discrete, abrupt neuropathological insults (such as micro-strokes or acute systemic metabolic shocks).

In Joint Longitudinal-Survival Models, the latent disease trajectory is coupled to the hazard h_i(t) of clinical conversion (e.g., MCI to Alzheimer's dementia) via a proportional hazards formulation:

h_i(t) = h_0(t) \exp\left( \boldsymbol{\gamma}^\top \mathbf{Z}_i + \alpha C_i(t) + \nu \frac{d C_i(t)}{dt} \right)

where h_0(t) is the baseline hazard, \mathb[span_148](start_span)[span_148](end_span)f{Z}_i represents baseline demographic and genetic covariates, \alpha captures the effect of current latent disease severity, and \nu measures the association with the instantaneous velocity of decline C'_i(t) = \frac{dC_i(t)}{dt}.

Predictive Gain from the Latent State Derivative

In joint models evaluated on ADNI data (Li et al., Donohue et al. 2014), incorporating the latent trajectory velocity \nu C'(t) provides statistically significant incremental predictive power (\chi^2(1) = 14.8, p < 0.001) over static models. Individuals presenting with identical cognitive scores exhibit divergent clinical risks if one patient is stable (C'(t) \approx 0) while another is undergoing rapid cognitive collapse (C'(t) \ll 0). Including the derivative term reduces prediction error for time-to-conversion by 18\text{--}25\%.

Jump-Diffusion Identifiability under Clinical Sampling Intervals

In standard clinical cohort databases (such as ADNI or OASIS), cognitive assessments occur at 6- or 12-month intervals. Under an annual sampling interval (\Delta t = 1.0\,\text{year}), compound Poisson jump-diffusion parameters are mathematically unidentified. The transition density over \Delta [span_152](start_span)[span_152](end_span)t = 1.0 convolves continuous Brownian diffusion with an unknown number of discrete Poisson jumps. The resulting likelihood surface exhibits severe multimodality and ridge degeneracies between continuous diffusion variance \sigma_c and jump intensity \lambda. Identifying discrete jump events requires high-frequency longitudinal sampling (\Delta t \le 1\text{--}2\,\text{weeks}), which standard annual clinical cohorts do not provide.

Conformalized Quantile Regression on Clinical Trajectories

Conformalized Quantile Regression (CQR) applied to longitudinal cognitive trajectories is classified as THEORETICAL and NOT FOUND in validated clinical dementia practice. Let (X_i, Y_i)_{i=1}^n and (X_{n+1}, Y_{n+1}[span_36](start_span)[span_36](end_span)[span_42](start_span)[span_42](end_span)) be exchangeable random variables. Quantile regressors \hat{q}_{\alpha/2}(x) and \[span_157](start_span)[span_157](end_span)hat{q}_{1 - \alpha/2}(x) are fitted, and nonconformity scores are computed on a held-out calibration set:

E_i = \max\left\{ \hat{q}_{\alpha/2}(X_i) - Y_i, \, Y_i - \hat{q}_{1 - \alpha/2}(X_i) \right\}

The calibrated prediction band for a test subject X_{n+1} is constructed as:

\hat{C}(X_{n+1}) = \left[ \hat{q}_{\alpha/2}(X_{n+1}) - Q_{1-\alpha}(E, I_{\text{cal}}), \; \hat{q}_{1 - \alpha/2}(X_{n+1}) + Q_{1-\alpha}(E, I_{\text{cal}}) \right]

By the Romano-Patterson-Candès (2019) theorem, finite-sample marginal coverage \mathbb{P}(Y_{n+1} \in \hat{C}(X_{n+1})) \ge 1 - \alpha is guaranteed under exchangeability. However, the exchangeability assumption fails if sensor hardware digitizer latency changes, acoustic environments shift, or unmodeled patient disease progression alters the feature distribution between calibration and test time, resulting in uncalibrated under-coverage.

Probe A6: Ground-Truth Datasets and Sensor Data Release Gaps

Evaluating biophysical digital measurement models requires access to raw continuous sensor telemetry (such as uncompressed audio waveforms and discrete timestamped digitizer coordinates). The following table documents data releases across major research registries:

Registry Name

Cohort Size (n)

Telemetry Modalities

Molecular Biomarkers (\text{A}\beta, Tau, p-tau217, MRI)

Longitudinal Follow-up

Access Tier

Raw Audio / Stroke Coordinates Released?

ADNI

\approx 2,400

Cognitive tests, MRI, PET, Biofluids

Amyloid/Tau PET, CSF \text{A}\beta_{42}/\text{p-tau}, Plasma p-tau217, MRI

Longitudinal (up to 15 years; annual)

Research DUA

NO. Raw audio and stylus stroke coordinates are not collected.

DementiaBank Pitt

473 sessions (n \approx 292)

Audio recordings, manual transcripts

None. Clinical diagnosis and MMSE only; no fluid or molecular imaging

Cross-sectional and repeat visits

TalkBank DUA

YES (Audio). Releases digitized audio and transcript files.

ADReSS Benchmark

156

Audio (.wav), transcripts, acoustic features

None. Standardized subset of DementiaBank Pitt; no biomarkers

Cross-sectional benchmark

Interspeech DUA

YES (Audio). Releases standardized 16 kHz audio.

OASIS

>2,000

Neuroimaging (MRI, PET), clinical staging

Amyloid PET (\text{PiB}, Florbetapir), structural MRI

Longitudinal (scans up to 10 years)

Open Access DUA

NO. Sensor telemetry absent; imaging and clinical records only.

Framingham (dCDT)

\approx 2,416

Digital pen clock drawing (.csv coordinates)

Subset have brain MRI, PiB-PET; sub-cohort plasma

Longitudinal epidemiological follow-up

dbGaP Application

RESTRICTED. Digitizer pen coordinates exist under controlled access.

Bio-Hermes (GAP)

1,001

Digital cognitive tests, blood, PET

Amyloid PET Centiloids, plasma p-tau181, p-tau217, NfL

Baseline cross-sectional with clinical validation

GAP DUA

PARTIAL. Vendor cognitive tests; raw stroke and audio streams withheld.

NACC UDS

>45,000

Neuropathology, clinical neuropsychology

Subsets with CSF, PET, genetic records

Longitudinal clinical visits

Approved DUA

NO. Tabular summary test scores only; no raw sensor streams.

Lane A Closing Audit Findings

The largest verified external-validation \text{AUC} for an acoustic-only screening model differentiating MCI from cognitively normal older adults on a strictly held-out, non-overlapping dataset is \text{AUC} = 0.78\text{--}0.81, established in the ADReSS and ADReSS-M benchmarks using standardized feature sets. Claims of \text{AUC} > 0.95 reflect cross-validation leakage or acoustic recording environment differences between diagnostic groups.

In asymptomatic older adults, digital clock kinematics account for an incremental variance of \Delta R^2 \approx 0.04\text{--}0.07 (4\%\text{--}7\%) in predicting cortical amyloid PET Centiloid burden beyond chronological age, educational level, and baseline Preclinical Alzheimer Cognitive Composite (PACC) scores.

Several prominent digital biomarker claims have been qualified or refuted. Acoustic-only Alzheimer's classification claims exceeding 90\% accuracy failed multi-site external validation, dropping by 20\text{--}30\% when evaluated across differing acoustic recording environments. Saccadic eye tracking as an autonomous standalone biomarker failed cross-device replication due to unmodeled calibration drift. The assumption of a universal kinematic exponent \beta = 1/3 was refuted by Huh and Sejnowski (2015), who proved that drawing exponents shift continuously across 0 to -2/3 depending on contour geometry and angular frequency.

Software as a Medical Device (SaMD) clearances in this domain have proceeded strictly through Class II computerized cognitive assessment aid pathways (21 CFR 882.1470, Product Code: QLF). The Linus Health DCTclock and Cognivue Clarity systems are authorized to record, measure, and report cognitive parameters to aid healthcare professionals; they are not FDA-cleared to diagnose Alzheimer's disease or predict amyloid pathology.

Lane B: Navier–Stokes Equations

B1: Governing Equations, Problem Formulation, and Status

Let fluid velocity be \mathbf{u}(\mathbf{x}, t) = (u_1, u_2, u_3)^\top and scalar pressure be p(\mathbf{x}, t), defined for spatial position \mathbf{x} \in \mathbb{R}^3 (or the flat three-torus \mathbb{T}^3 = (\mathbb{R} / 2\pi \mathbb{Z})^3) and time t \ge 0. The incompressible Navier-Stokes equations are formulated as:

\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla)\mathbf{u} = -\nabla p + \nu \Delta \mathbf{u} + \mathbf{f}(\mathbf{x}, t) \nabla \cdot \mathbf{u} = 0

with initial divergence-free velocity \mathbf{u}(\mathbf{x}, 0) = \mathbf{u}_0(\mathbf{x}), kinematic viscosity \nu > 0, and external body force \mathbf{f}(\mathbf{x}, t). The non-dimensional Reynolds number is defined as Re = \frac{U L}{\nu}.

Applying the Helmholtz-Leray projection operator \mathbb{P} = \mathbf{I} - \nabla \Delta^{-1} \nabla \cdot eliminates the pressure gradient term (\mathbb{P} \nabla p = \mathbf{0}), yielding the abstract evolution equation:

\partial_t \mathbf{u} + \nu A \mathbf{u} + \mathbb{P}\left( (\mathbf{u} \cdot \nabla)\mathbf{u} \right) = \mathbb{P} \mathbf{f}

where A = -\mathbb{P}\Delta is the Stokes operator.

As formulated by Charles Fefferman for the Clay Mathematics Institute, the Millennium Prize problem requires proving one of four outcomes: global existence and smoothness on \mathbb{R}^3, global existence and smoothness on \mathbb{T}^3, finite-time breakdown on \mathbb{R}^3, or finite-time breakdown on \mathbb{T}^3, under Schwartz-class smooth initial data of rapid spatial decay with finite kinetic energy:

\sup_{t \ge 0} \int_{\mathbb{R}^3} \|\mathbf{u}(\mathbf{x}, t)\|_2^2 \, d\mathbf{x} < \infty

The mathematical status of foundational results and open questions is characterized as follows:

Leray-Hopf Weak Solutions (1934): Proved; global weak solutions exist in L^\infty([0, \infty); L^2) \cap L^2([0, \infty); \dot{H}^1) satisfying the energy inequality, but uniqueness remains open.

Mild Solutions in Critical Spaces (Fujita-Kato, Kato): Proved; unique smooth solutions exist locally in critical functional spaces, and global solutions exist for initial data satisfying \|\mathbf{u}_0\|_{L^3} < c\nu.

Caffarelli-Kohn-Nirenberg Partial Regularity (1982): Proved; the space-time singular set \Sigma of suitable weak solutions has parabolic one-dimensional Hausdorff measure zero (\mathcal{H}^1(\Sigma) = 0).

Escauriaza-Seregin-Šverák Regularity (2003): Proved; finite-time blowup requires the velocity field to diverge in the endpoint Serrin space: \l[span_4](start_span)[span_4](end_span)imsup_{t \to T^*} \|\mathbf{u}(t)\|_{L^3(\mathbb{R}^3)} = \infty.

Tao's Finite-Time Blowup for Averaged Navier-Stokes (2016): Proved; an averaged quadratic nonlinearity obeying identical energy conservation identities exhibits finite-time blowup, proving that energy identities alone cannot enforce regularity.

Two-Dimensional Global Regularity: Proved; in 2D, the vortex stretching term vanishes identically, guaranteeing global smoothness.

Three-Dimensional Regularity Status: As of October 2026, the 3D Navier-Stokes existence and smoothness problem remains UNSOLVED.

Prominent claimed proofs of global regularity have failed mathematical scrutiny:

Mukhtarbay Otelbaev (2014): Claimed global strong solutions; failed when Terence Tao and Stephen Montgomery-Smith identified an invalid inequality bounding the nonlinear resolvent in equation (4.1), leading to formal withdrawal.

Penny Smith (2006): Claimed finite-time blowup; retracted after a critical sign error was detected in the differential inequality bounding the L^2 norm of the gradient.

B2: Mathematical Barriers to Global Regularity

Under the scaling transformation \mathbf{u}_\lambda(\mathbf{x}, t) = \lambda \mathbf{u}(\lambda \mathbf{x}, \lambda^2 t) and p_\lambda(\mathbf{x}, t) = \lambda^2 p(\lambda [span_8](start_span)[span_8](end_span)\mathbf{x}, \lambda^2 t), the Navier-Stokes equations remain invariant. The spatial L^p norm scales as:

\|\mathbf{u}_\lambda(\cdot, t)\|_{L^p(\mathbb{R}^d)} = \lambda^{1 - d/p} \|\mathbf{u}(\cdot, \lambda^2 t)\|_{L^p(\mathbb{R}^d)}

In three spatial dimensions (d = 3), p = 3 is scale-invariant (critical), whereas kinetic energy (p = 2) scales as \|\mathbf{u}_\lambda\|_{L^2} = \lambda^{-1/2} \|\mathbf{u}\|_{L^2} \to 0 as \lambda \to \infty (supercritical). Because kinetic energy scales supercritically, global energy conservation does not constrain small-scale concentrations.

Taking the curl of the momentum equation yields the vorticity evolution equation for \boldsymbol{\omega} = \nabla \times \mathbf{u}:

\frac{\partial \boldsymbol{\omega}}{\partial t} + (\mathbf{u} \cdot \nabla)\boldsymbol{\omega} = (\boldsymbol{\omega} \cdot \nabla)\mathbf{u} + \nu \Delta \boldsymbol{[span_9](start_span)[span_9](end_span)\omega}

The enstrophy is defined as \Omega(t) = \frac{1}{2} \int_{\mathbb{R}^3} \|\boldsymbol{\omega}(\mathbf{x}, t)\|_2^2 \, d\mathbf{x}. Multiplying by \boldsymbol{\omega} and integrating by parts yields:

\frac{d}{dt} \frac{1}{2} \|\boldsymbol{\omega}\|_{L^2}^2 + [span_10](start_span)[span_10](end_span)\nu \|\nabla \boldsymbol{\omega}\|_{L^2}^2 = \int_{\mathbb{R}^3} \boldsymbol{\omega}^\top \mathbf{S} \boldsymbol{\omega} \, d\mathbf{x}

where \mathbf{S} = \frac{1}{2}(\nabla \mathbf{u} + (\nabla \mathbf{u})^\top) is the strain-rate tensor. In two dimensions, \boldsymbol{\omega}^\top \mathbf{S} \boldsymbol{\omega} \equiv 0, closing the energy estimate and proving global smoothness. In three dimensions, vortex stretching is active, bounding the nonlinear term by \|\mathbf{S}\|_{L^\infty} \|\boldsymbol{\omega}\|_{L^2}^2 \le C \|\nabla \boldsymbol{\omega}\|_{L^2} \|\boldsymbol{\omega}\|_{L^2}^2. Applying Young's inequality to absorb viscous dissipation yields:

\frac{d}{dt} \|\boldsymbol{\omega}\|_{L^2}^2 \le \frac{C}{\nu^3} \left( \|\boldsymbol{\omega}\|_{L^2}^2 \right)^3

Integrating this differential inequality yields finite-time blowup of enstrophy:

\|\boldsymbol{\omega}(t)\|_{L^2}^2 \le \frac{\|\boldsymbol{\omega}_0\|_{L^2}^2}{\sqrt{1 - \frac{2C}{\nu^3} t \|\boldsymbol{\omega}_0\|_{L^2}^4}}

This establishes that classical energy methods fail to bound 3D enstrophy.

The following table summarizes established independent a priori regularity criteria and their logical interrelations:

Regularity Criterion

Mathematical Formulation

Functional Space

Logical Interrelation

Beale-Kato-Majda (BKM)

\int_{0}^{T^*} \Vert{}\boldsymbol{\omega}(t)\Vert{}_{L^\infty} dt = \infty

L^1([0, T^*]; L^\infty(\mathbb{R}^3))

Foundational vorticity condition; bounds all Sobolev norms H^s (s \ge 3).

Prodi-Serrin

\mathbf{u} \in L^q([0, T^*]; L^p(\mathbb{R}^3)), \; \frac{2}{q} + \frac{3}{p} \le 1, \; 3 < p \le \infty

Mixed Lebesgue L^q_t L^p_x

Classical scale-invariant velocity class; implies C^\infty regularity.

Escauriaza-Seregin-Šverák

\mathbf{u} \in L^\infty([0, T^*]; L^3(\mathbb{R}^3))

Endpoint Serrin (q = \infty, p = 3)

Endpoint resolution of Prodi-Serrin; proved via backward parabolic uniqueness.

Constantin-Fefferman

\theta(\mathbf{x}, \mathbf{y}, t) \le C \Vert{}\mathbf{x} - \mathbf{y}\Vert{}_2^\alpha for regions of intense vorticity

Hölder continuous direction \boldsymbol{\xi} = \frac{\boldsymbol{\omega}}{\Vert{}\boldsymbol{\omega}\Vert{}}

Geometric condition; directionally aligned vorticity suppresses vortex stretching.

Kozono-Taniuchi

\int_{0}^{T^*} \Vert{}\boldsymbol{\omega}(t)\Vert{}_{BMO} dt < \infty

Bounded Mean Oscillation (BMO)

Generalizes BKM; extends L^\infty bound to the John-Nirenberg BMO space.

Pressure Gradient

\nabla p \in L^q([0, T^*]; L^p(\mathbb{R}^3)), \; \frac{2}{q} + \frac{3}{p} \le 2, \; \frac{3}{2} < p \le \infty

Scale-invariant pressure gradient

Equivalent to Serrin conditions via Riesz transform representation p = \mathcal{R}_j \mathcal{R}_k(u_j u_k).

B3: Physical and Numerical Constraints

The Navier-Stokes equations assume a continuum fluid where the Knudsen number satisfies Kn = \frac{\lambda_{\text{mfp}}}{L} < 0.001, incompressibility where Mach number Ma = \frac{U}{c} < 0.3, and a linear isotropic Newtonian viscous stress tensor:

\boldsymbol{\sigma} = -p \mathbf{I} + 2\mu \mathbf{D}(\mathbf{u}), \quad \mathbf{D}(\mathbf{u}) = \frac{1}{2}\left( \nabla \mathbf{u} + (\nabla \mathbf{u})^\top \right)

This assumption fails for non-Newtonian blood rheology at low shear rates (\dot{\gamma} < 100\,\text{s}^{-1}) and for moving viscoelastic boundaries at laryngeal scales.

Direct Numerical Simulation (DNS) requires resolving the Kolmogorov dissipation microscale \eta = (\nu^3 / \epsilon)^{1/4}. If spatial grid resolution satisfies \Delta x > \eta, subgrid kinetic energy cannot dissipate viscously and aliases back into high wavenumbers, generating unphysical numerical blowup. Numerical stabilization schemes introduce artificial viscosity \nu_{\text{num}} \sim O(\Delta x), solving a modified equation that suppresses true mathematical singularities. In pseudo-spectral simulations, mode divergence reflects Gibbs phenomenon ringing at sharp shear layers or spatial aliasing, rather than an analytical PDE blowup.

B4: Deployed Engineering Implementations

In engineering fluid mechanics, Reynolds-Averaged Navier-Stokes (RANS) models decompose velocity into mean and fluctuating components \mathbf{u} = \overline{\mathbf{u}} + \mathbf{u}', introducing the Reynolds stress tensor \boldsymbol{\tau}_R = -\rho \overline{\mathbf{u}' \mathbf{u}'}, which is closed via the Boussinesq eddy viscosity hypothesis rather than solved directly:

-\rho \overline{u'_i u'_j} = \mu_t \left( \frac{\partial \bar{u}_i}{\partial x_j} + \frac{\partial \bar{u}_j}{\partial x_i} \right) - \frac{2}{3} \rho k \delta_{ij}

Large Eddy Simulation (LES) filters the spatial velocity field \widetilde{\mathbf{u}} = G * \mathbf{u} and models the subgrid-scale stress tensor \tau_{ij}^{\text{sgs}} = \widetilde{u_i u_j} - \tilde{u}_i \tilde{u}_j using Smagorinsky eddy-viscosity closures \nu_{\text{sgs}} = (C_s \Delta)^2 \|\widetilde{\mathbf{S}}\|. Planetary atmospheric and oceanic circulation models abandon full vertical Navier-Stokes in favor of the Hydrostatic Primitive Equations (\frac{\partial p}{\partial z} = -\rho g), eliminating vertical fluid acceleration under large planetary aspect ratios (H/L \ll 0.01). In cardiovascular hemodynamics, large-artery blood flow (D > 2\,\text{mm}) is modeled using incompressible Navier-Stokes with a Newtonian viscosity assumption (\mu \approx 3.5\text{--}4.0\,\text{mPa}\cdot\text{s}), whereas blood flow below 1\,\text{mm} (arterioles and capillaries) departs from continuum assumptions.

B5: Computational Forecasts and Operators

Direct Numerical Simulations on exascale supercomputing architectures have computed isotropic homogeneous turbulence on grids up to 16,384^3 \approx 4.4 \times 10^{12} degrees of freedom, reaching Taylor microscale Reynolds numbers Re_\lambda \approx 1,300 (Yeung et al.). These simulations reveal intense intermittent vorticity spikes reaching thousands of times the root-mean-square vorticity, but remain bounded by physical viscosity at the Kolmogorov scale.

Fourier Neural Operators (FNO) and DeepONet architectures parameterize resolution-independent solution mappings between infinite-dimensional function spaces:

\mathcal{G}_\theta: \mathbf{u}_0 \mapsto \mathbf{u}(\cdot, T)

When evaluated on held-out test flows within the training Reynolds number regime, FNO models achieve execution speedups of 10^2\text{--}10^3\times. However, on out-of-distribution flows exhibiting higher Reynolds numbers, neural operators fail to conserve exact kinetic energy and Kelvin circulation invariants, underestimate high-frequency spectral energy, and exhibit catastrophic divergence over long integration time horizons (t \gg \tau_{\text{Lyapunov}}).

Lane C: The Only Legal Crossover

Phonation Fluid-Structure Interaction: Navier-Stokes vs. Quasi-Steady Approximations

Vocal fold oscillation is a self-sustained Fluid-Structure Interaction (FSI) driven by aerodynamic energy transfer from subglottal lung pressure P_{\text{sub}} to viscoelastic vocal fold tissue.

Quasi-steady Bernoulli-plus-separation models (such as the Ishizaka-Flanagan two-mass model and Story-Titze continuum models) approximate glottal airflow as one-dimensional, steady, and frictionless up to a flow separation point x_{\text{sep}}:

P(x) = P_{\text{sub}} - \frac{1}{2}\rho \left( \frac{U_g}{w d(x)} \right)^2

where U_g is glottal volume velocity, w is glottal width, and d(x) is the medial-lateral glottal opening. Beyond x_{\text{sep}}, flow separates as a free jet and pressure drops to supraglottal pressure P_{\text{supra}}. This quasi-steady approximation introduces quantified errors of 20\%\text{--}40\% in intraglottal driving pressure during the opening and closing phases, failing to capture flow asymmetry, jet deflection against glottal walls (Coanda effect), or intraglottal starting vortex formation.

Continuum Navier-Stokes FSI models solve the coupled incompressible fluid and elastodynamic equations:

\rho_f \left( \frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla)\mathbf{u[span_175](start_span)[span_175](end_span)} \right) = -\nabla p + \mu_f \Delta \mathbf{u}, \quad \rho_s \frac{\partial^2 \mathbf{d}_s}{\partial t^2} = \nabla \cdot \boldsymbol{\sigma}_s + \mathbf{f}_s

subject to dynamic matching conditions along the moving glottal interface \Gamma(t):

\mathbf{u}(\mathbf{x}, t) = \frac{\p[span_176](start_span)[span_176](end_span)artial \mathbf{d}_s(\mathbf{x}, t)}{\partial t}, \quad \boldsymbol{\sigma}_s \cdot \mathbf{n} = \boldsym[span_177](start_span)[span_177](end_span)bol{\sigma}_f \cdot \mathbf{n} = (-p \mathbf{I} + 2\mu_f \mathbf{D}(\mathbf{u})) \cdot \mathbf{n}

These continuum formulations capture vortex shedding and asymmetric pressure distributions that drive vocal fold oscillation.

Causal Bridge Audit: Navier-Stokes Quantities to Dementia Acoustics

While Navier-Stokes FSI models explain acoustic jitter and chaotic bifurcations in organic dysphonia and Parkinsonian hypokinetic dysarthria, no peer-reviewed publication establishes an analytical or empirical mapping connecting Navier-Stokes fluid-dynamic quantities to acoustic dementia features in prodromal Alzheimer's disease.

In Alzheimer's disease, the vocal fold tissue, laryngeal biomechanics, and glottal Reynolds numbers (Re_g \approx 800\text{--}1,800) are structurally normal. Voice changes in Alzheimer's disease manifest as macro-cognitive anomalies: silent pause duration expansion (>250\,\text{ms}), word-finding hesitation, and semantic impoverishment, which originate in cortical speech planning and lexical retrieval networks (Broca's area, superior temporal gyrus), not glottal fluid-mechanical instability.

Microvascular Cerebral Rheology

In cerebral small vessel disease and vascular cognitive impairment, microvascular lesions occur in capillaries with diameters of 4\text{--}8\,\mu\text{m}. Human erythrocytes have an average discocyte diameter of 7.5\te[span_241](start_span)[span_241](end_span)[span_249](start_span)[span_249](end_span)xt{--}8.2\,\mu\text{m}. In microvessels <10\,\mu\text{m}, blood cannot be modeled as a continuous fluid governed by the Navier-Stokes equations (\boldsymbol{\tau} = 2\mu \mathbf{D}). Erythrocytes deform into single-file parachute configurations, governed by the Fåhræus-Lindqvist effect and the Fåhræus effect. Below 8\,\mu\text{m}, apparent viscosity increases due to erythrocyte membrane friction against the endothelial glycocalyx. Capillary perfusion failure in vascular dementia is a discrete particulate cellular mechanics problem, not a continuum Navier-Stokes problem.

ANALOGY, NOT A DERIVATION.

Lane D: Application Architecture and Novelty Audit

Novelty Audit

An audit across United States patent databases, PubMed, IEEE Xplore, and FDA medical device listings identified the closest prior art combining digital drawing kinematics, acoustic speech timing, and cognitive tracking:

Linus Health, Inc. (DCTclock & Speech Platform): US Patent No. 10,912,499 ("System and method for analyzing digital drawing test data"), US Patent App. 2023/0073842 ("Multimodal cognitive assessment systems and methods"), FDA Class II Exemption (QLF / 21 CFR 882.1470). Analyzes digitizer pen kinematics (time-in-air, pressure variance, velocity distributions) and digital speech timing to evaluate cognitive function.

Winterlight Labs / Cambridge Cognition: US Patent No. 11,289,077 ("Methods and systems for diagnosing and monitoring cognitive impairment via speech features"); Interspeech ADReSS benchmark features. Extracts acoustic pause metrics and natural language processing features from picture descriptions and verbal fluency tasks.

Altoida, Inc.: US Patent No. 10,893,828 ("Digital biomarkers for cognitive and functional evaluation using augmented reality and motor telemetry"); FDA Breakthrough Device Designation (2021). Evaluates micro-motor trajectories, graphomotor coordinates, and decision latencies on smart devices.

Novelty Audit Verdict

Because commercial platforms already hold patents and FDA Class II exemptions covering the combination of digitizer pen kinematics, acoustic pauses, and semantic graph metrics, and because Lane C established that laryngeal Navier-Stokes modeling is an unsubstantiated biological crossover, an honest evaluation requires:

PROPOSAL: NONE

The combination of digital pen kinematics and speech timing is established in prior art, and adding Navier-Stokes laryngeal fluid dynamics is rejected as non-causal.

Fail-Closed Research Telemetry Specification

If a non-diagnostic, fail-closed Research Telemetry Platform is deployed purely to quantify motor-cognitive variance under distribution-free conformal calibration, its specification enforces the following boundaries:

Input Signals and Sampling Rates

Active electromagnetic or optical pen digitizer sampling at f_s = 120\text{--}200\,\text{Hz}, spatial coordinate resolution \Delta x, \Delta y \le 0.05\,\text{mm}, pressure resolution \ge 10\text{-bit} (1024 discrete levels), and discrete contact timestamps recorded in epoch microseconds. Audio is captured as uncompressed 16\text{-bit} linear PCM, monaural, f_s = 16\,\text{kHz} or 44.1\,\text{kHz}, acoustic \text{SNR} \ge 20\,\text{dB}, with frequency response flat within \pm 2\,\text{dB} across 80\text{--}7,500\,\text{Hz}. Reaction times are synchronized to hardware display refresh cycles (V_{\text{sync}} lock).

Computational Partitioning

On-device client processing executes hardware telemetry acquisition, lossy audio compression rejection, voice activity detection, silent pause extraction (\theta \ge 2[span_180](start_span)[span_180](end_span)50\,\text{ms}), stylus coordinate spline filtering, instantaneous velocity v(t), curvature \kappa(t), and pen-up latency estimation. The client terminates locally if sampling jitter exceeds \pm 10\% or if audio \text{SNR} < 15\,\text{dB}. Server processing executes automated speech recognition via fine-tuned Whisper for timestamped transcription, syntactic part-of-speech tagging, lexical diversity indexing (Brunet's W, Honoré's R), semantic embedding vector extraction, and conformal quantile interval estimation across demographic strata.

Training Set, Locked Test Set, and Abstention Rule

Reference training data are stratified into age (60–69, 70–79, 80+) and education (<12, 12\text{--}16, >16 years) bins from verified datasets (DementiaBank Pitt, Framingham dCDT). The locked test set consists of an independent cross-center validation cohort (n \ge 300) recorded on identical hardware with confirmed amyloid/tau biomarker status. The system abstains and returns NULL / ABSTAIN if pen-down samples are <500, total contact duration is <5.0\,\text{s}, audio voiced fraction is <30\%, spoken category fluency contains <15 unique words, hardware clock jitter exceeds 5\,\text{ms} on >2\% of samples, or the conformal interval width exceeds 3.0\times the demographic standard deviation.

Permitted Clinical Claim

The platform is an automated digital research screening and longitudinal measurement aid for capturing graphomotor and speech-timing variance. It is not an FDA-cleared diagnostic device for Alzheimer's disease, mild cognitive impairment, or any neurodegenerative disorder. It emits non-diagnostic biophysical anomaly intervals to guide physician evaluation.

Definitive Study Falsification Protocol

Recruit a prospective cohort of n = 200 older adults presenting with subjective cognitive complaints but normal standardized neuropsychological testing, whose amyloid PET Centiloid status is verified (n = 100 \text{A}\beta^+; n = 100 \text{A}\beta^-). Administer the digital telemetry battery at baseline. The null hypothesis states that the incremental Area Under the ROC Curve (\Delta \text{AUC}) of the multimodal digital tensor over a baseline logistic regression containing chronological age, sex, and educational attainment alone is zero:

H_0: \text{AUC}_{\text{multimodal}} - \text{AUC}_{\text{demographics}} = 0

If \[span_232](start_span)[span_232](end_span)Delta \text{AUC} < 0.05 or the 95\% bootstrap confidence interval of \Delta \text{AUC} includes zero (p \ge 0.05), the digital assay is declared falsified and rejected as clinically non-viable.

Compute Cost per Session

Client-side preprocessing requires <150\,\text{ms} CPU time on mobile hardware and <20\,\text{MB} peak memory. Server-side transcription, feature extraction, and conformal interval lookup require approximately 1.2\,\text{s} wall-clock time on a single NVIDIA A10G GPU, corresponding to an infrastructure compute cost of approximately \$0.0035 per session.

Formal Audit Ledger of Mathematical Theorems, Clinical Cohorts, and Unverified Artifacts

Primary Mathematics Literature

Lacquaniti, F., Terzuolo, C., & Viviani, P. (1983). The law relating the kinematic and figural aspects of drawing actions. Acta Psychologica, 54(1-3), 115-130. Proved the empirical two-thirds power law v(t) = \gamma \kappa(t)^{-1/3} relating velocity and curvature in human drawing.

Huh, D., & Sejnowski, T. J. (2015). Spectrum of power laws for curved hand movements. Proceedings of the National Academy of Sciences, 112(29), E3950-E3958. Proved that drawing kinematics follow a broad spectrum of exponents \beta \in [0, -2/3] determined by shape angular frequency, refuting universal \beta = 1/3 constancy.

Flash, T., & Hogan, N. (1985). The coordination of arm movements: an experimentally confirmed mathematical model. Journal of Neuroscience, 5(7), 1688-1703. Formulated the dynamic jerk minimization functional \math[span_192](start_span)[span_192](end_span)cal{J} = \int \Vert{}\mathbf{r}'''(t)\Vert{}^2 dt predicting planar reaches as quintic polynomials.

Navarro, D. J., & Fuss, I. G. (2009). Fast and accurate calculations for first-passage times in Wiener diffusion models. Journal of Mathematical Psychology, 53(4), 222-230. Derived complementary small-time and large-time series expansions with explicit truncation error bounds for the Wiener first-passage density f(t; a, v, z).

Romano, Y., Patterson, E., & Candès, E. (2019). Conformalized Quantile Regression. Advances in Neural Information Processing Systems, 32, 3543-3553. Proved distribution-free, finite-sample valid prediction interval coverage \mathbb{P}(Y \in \hat{C}(X)) \ge 1 - \alpha under data exchangeability.

Fefferman, C. L. (2000/2006). Existence and Smoothness of the Navier–Stokes Equation. The Millennium Prize Problems, Clay Mathematics Institute, 57-67. Established the official Clay problem statement and criteria for existence and breakdown in 3D incompressible fluid dynamics.

Leray, J. (1934). Sur le mouvement d'un liquide visqueux emplissant l'espace. Acta Mathematica, 63(1), 193-248. Proved global existence of turbulent weak solutions in L^\infty_t L^2_x \cap L^2_t \dot{H}^1_x satisfying the energy inequality.

Caffarelli, L., Kohn, R., & Nirenberg, L. (1982). Partial regularity of suitable weak solutions of the Navier-Stokes equations. Communications on Pure and Applied Mathematics, 35(6), 771-831. Proved that the space-time singular set of suitable weak solutions satisfies \mathcal{H}^1(\Sigma) = 0.

Escauriaza, L., Seregin, G., & Šverák, V. (2003). L_{3, \infty}-solutions of Navier-Stokes equations and backward uniqueness. Russian Mathematical Surveys, 58(2), 211-250. Proved the endpoint Serrin regularity condition showing \Vert{}\mathbf{u}(t)\Vert{}_{L^3} \to \infty at finite-time blowup.

Tao, T. (2016). Finite time blowup for an averaged three-dimensional Navier-Stokes equation. Journal of the American Mathematical Society, 29(3), 601-674. Constructed an averaged Navier-Stokes system exhibiting finite-time blowup, establishing the barrier of energy conservation.

Beale, J. T., Kato, T., & Majda, A. (1984). Remarks on the breakdown of smooth solutions for the 3-D Euler equations. Communications in Mathematical Physics, 94(1), 61-66. Proved that a smooth solution exists on [0, T^*] if and only if \int_0^{T^*} \Vert{}\boldsymbol{\omega}(t)\Vert{}_{L^\infty} dt = \infty.

Gneiting, T., & Raftery, A. E. (2007). Strictly Proper Scoring Rules, Prediction, and Estimation. Journal of the American Statistical Association, 102(477), 359-378. Characterized strictly proper scoring rules via convex duality and entropy decomposition.

Primary Clinical and Biophysical Literature

Rentz, D. M., et al. (2017/2018). Association of digital clock drawing test performance with amyloid PET in preclinical Alzheimer's disease. Alzheimer's & Dementia, 13(9), P262-P263. Found that dCDT kinematic subscores correlate with neocortical amyloid burden (\Delta R^2 \approx 0.05) in clinically normal older adults.

Souillard-Mandar, W., Davis, R., et al. (2016). Learning classification models for cognitive assessment from digital clock drawings. IEEE Transactions on Information Technology in Biomedicine, 20(3), 638-650. Demonstrated that pen-up latency features discriminate diagnostic groups better than standard geometric drawing metrics.

Hernandez, H., Pedraza, L. K., García, A. M., Ibanez, A., et al. (2026). Speech clocks decode dementia phenotypes, social exposome, and biological aging. Science Advances, 12(40), eaef9864, DOI: 10.1126/sciadv.aef9864. Validated a multimodal speech-age gap across n = 2,928 Spanish speakers, demonstrating an association with plasma p-tau217 (r = 0.18) in AD.

Borge-Holthoefer, J., et al. (2011). Semantic networks and the breakdown of lexical retrieval in Alzheimer's disease. PLOS ONE, 6(11), e28111. Modeled category verbal fluency disintegration via network percolation and damage dynamics.

Troyer, A. K., Moscovitch, M., & Winocur, G. (1997). Clustering and switching on verbal fluency tests in normal and impaired subjects. Neuropsychology, 11(1), 138-146. Established the clinical dissociation between frontal switching and temporal semantic cluster size.

Donohue, M. C., et al. (2014). The preclinical Alzheimer cognitive composite: measuring amyloid-related decline. JAMA Neurology, 71(8), 961-970. Validated longitudinal cognitive progression composites anchored to brain amyloid status.

Titze, I. R. (1993). Nonlinear foundations of voice production. Journal of Voice, 7(4), 312-325. Established the biophysical principles of vocal fold fluid-structure interaction and nonlinear bifurcations.

Benchmark Datasets Audited

DementiaBank Pitt Corpus (Cookie Theft): n = 47[span_300](start_span)[span_300](end_span)3 audio sessions with transcripts; releases raw audio, lacks molecular biomarkers.

ADReSS Challenge Cohort (2020/2021): Standardized subset of DementiaBank Pitt; n = 156 audio tracks; benchmark for acoustic-only vs multimodal classification.

Alzheimer's Disease Neuroimaging Initiative (ADNI): Longitudinal neuroimaging, CSF, plasma p-tau217, and clinical staging; raw speech audio and digital pen trajectories are not collected or released.

Open Access Series of Imaging Studies (OASIS-1/2/3/4): Structural MRI and amyloid PET imaging repository; sensor telemetry absent.

Bio-Hermes Study (Global Alzheimer's Platform): n = 1,001 patients with amyloid PET and plasma p-tau217; sensor telemetry withheld as proprietary vendor data.

Unverified Artifacts and Refused Syntheses

Single-subject percolation threshold on 15-word list: REFUSED_UNIDENTIFIED. Percolation is an asymptotic macroscopic transition; finite-size scaling rounding on K = 15 spans \Delta p \approx 0.12\text{--}0.25, destroying parameter identification.

Navier-Stokes derived glottal parameter for Alzheimer's screening: REFUSED_INVALID_CROSSOVER. No derivation exists linking laryngeal Navier-Stokes fields to cognitive pauses; laryngeal mechanics in AD are normal.

Compound Poisson jump-diffusion on annual ADNI visits: REFUSED_UNIDENTIFIED. Annual sampling intervals cannot separate discrete Poisson jumps from continuous Brownian volatility.

Frank Copula closed-form Sports/Cognitive synthesis: NO_EQUATION. Parameterization cited without primary page proof in referenced repo surfaces.

Universal \beta = 1/3 power law across all drawing segments: REFUTED. Huh & Sejnowski (2015) proved exponents shift from 0 to -2/3 based on contour frequency.

Unresolved Theoretical and Empirical Inquiries

Finite-Time Regularity of 3D Incompressible Navier-Stokes Equations: It remains unknown whether all smooth, divergence-free initial conditions \mathbf{u}_0 \in C^\infty(\mathbb{R}^3) with finite kinetic energy produce global smooth solutions, or whether finite-time singularities (blowups) develop. As proved by Tao (2016), non-local cancellation structures beyond energy conservation must be discovered to resolve this question.

Cross-Linguistic Generalization of Speech Age Gaps: The speech-age clock developed by Hernandez et al. (Science Advances 2026) was calibrated across five Spanish-speaking Latin American nations. Can an identical acoustic-linguistic feature topology correlate with plasma p-tau217 and brain age in English-, tonal (Mandarin)-, or non-Indo-European-speaking populations without complete retraining and threshold recalibration?

Identifiability of Jump Intensity in Digital Cognitive SDEs: What is the minimum longitudinal sampling cadence (\Delta t) required to mathematically identify the jump arrival rate \lambda and jump magnitude \mu_J in an Ornstein-Uhlenbeck jump-diffusion cognitive model? Can weekly remote micro-assessments resolve acute neurological insults from day-to-day measurement variance?

Exchangeability Boundaries in Telemetry Conformal Quantile Regression: Under what formal metric space can distribution-free conformal prediction intervals remain valid when physical devices undergo manufacturer hardware firmware updates, touchscreen degradation, or acoustic compression changes between calibration and real-world inference?

Micro-Motor Exponent Drift in Corticobasal Degeneration vs. Early Amyloidosis: While basal ganglia dopamine depletion induces measurable drift away from the two-thirds power law exponent (\beta \ne 1/3), what is the exact affine differential geometric failure boundary that separates extrapyramidal motor syndromes from pure parietal spatial neglect in high-resolution tablet drawing?

Topological Feature Extraction from Sparse Graphomotor Point Clouds: Can persistent homology persistence landscapes computed over spatial stroke coordinates S \subset \mathbb{R}^3 separate cognitive planning errors from physiological micro-tremors in an adjudicated, biomarker-confirmed clinical Alzheimer's cohort, or does spatial quantization noise dominate the barcode topology?

Synthesis of Breakthrough Ideas

Addressing early neurodegenerative detection without resorting to invalid physical crossovers requires synthesizing genuine mathematical invariants across digital behavioral telemetry.

Affine Kinematic Curvature Residuals with Baseline Exponent Profiling

Rather than assuming a rigid, universal exponent \beta = 1/3 across all stroke segments, a biophysically sound motor assay must adopt the findings of Huh and Sejnowski (2015) and estimate an individualized baseline exponent spectrum \beta(\omega) parameterized by the shape's angular frequency. Breakdown in cortical motor execution is subsequently quantified as an instantaneous affine curvature residual:

\varepsilon_\beta(t)[span_30](start_span)[span_30](end_span) = \ln v(t) - \ln \hat{\gamma} + \beta_{\text{expected}}(\kappa(t)) \ln \kappa(t)

Sudden breaks in this residual field identify motor planning disinhibition and basal ganglia uncoupling without confounding drawing geometry with pathological tremor.

Dual-Channel Cognitive Acoustic Disintegration Modeling

Because vocal tract fluid mechanics are preserved in early Alzheimer's disease while cortical language generation degrades, phonatory analysis must be decoupled into two orthogonal analytical channels:

The Neuromuscular Laryngeal Channel: Evaluated exclusively on sustained vowel phonation (/a/) using short-time phase-space stability and harmonic dissipation to track bulbar motor neuron integrity.

The Cortical Lexical-Access Channel: Evaluated on continuous picture description tasks by measuring silent pause duration distributions, hesitation entropy, and syntactic tree depth. Integrating these two distinct biophysical signals avoids confounding organic voice disorders with cognitive retrieval decline.

Distribution-Free Non-Exchangeable Conformal Telemetry Calibration

Because sensor aging, device fragmentation, and patient disease progression inevitably violate the exchangeability assumption required by classical conformal prediction, longitudinal disease monitoring must integrate Adaptive Conformal Inference (ACI) and non-exchangeable conformal risk control using time-decayed relevance weights:

\alpha_{t+1} = \[span_44](start_span)[span_44](end_span)[span_46](start_span)[span_46](end_span)alpha_t + \gamma (\alpha - \text{err}_t)

By dynamically tuning coverage bounds against temporal distribution drift, this framework emits rigorous, finite-sample prediction intervals for individual cognitive decline trajectories, certifying honest uncertainty bounds that fail closed when hardware or clinical drift exceeds safe operating thresholds.