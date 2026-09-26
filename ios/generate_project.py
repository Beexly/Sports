#!/usr/bin/env python3
"""
Regenerates ios/GalaxySportsEdge.xcodeproj from the file tree.

WHY THIS EXISTS
---------------
The project file used to be hand-maintained: every new Swift file meant a new
PBXFileReference, a new PBXBuildFile, a group child entry and a sources-phase
entry, in four different sections, with 24-hex ids invented by hand. That is
four chances to get it wrong per file and no way to notice until Xcode refuses
to open the project. A test suite of eight files would have been thirty-two
chances.

So the project file is GENERATED. The tree on disk is the source of truth; this
script projects it into a pbxproj. Adding a file is `git add` and nothing else.

Ids are derived from a semantic key rather than randomly, so regenerating with
no changes on disk produces a byte-identical file. That is what makes
`--check` meaningful and keeps diffs empty when nothing actually moved.

Usage:  python3 ios/generate_project.py [--check]

  --check   Write nothing; exit 1 if the project is out of date. CI runs this so
            a hand-edited project file cannot drift from the tree again.
"""

from __future__ import annotations

import hashlib
import os
import sys
from dataclasses import dataclass

APP_NAME = "GalaxySportsEdge"
TEST_NAME = "GalaxySportsEdgeTests"


def find_root() -> str:
    """The `ios/` directory, wherever this script happens to live.

    Walking up to the folder that actually contains the app and the project is
    the only version of this that survives the script being moved.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        if os.path.isdir(os.path.join(here, APP_NAME)) and os.path.isdir(
            os.path.join(here, APP_NAME + ".xcodeproj")
        ):
            return here
        parent = os.path.dirname(here)
        if parent == here:
            break
        here = parent
    raise SystemExit("could not locate the ios/ directory")


ROOT = find_root()
APP_DIR = os.path.join(ROOT, APP_NAME)
TEST_DIR = os.path.join(ROOT, TEST_NAME)
PBXPROJ = os.path.join(ROOT, APP_NAME + ".xcodeproj", "project.pbxproj")
SCHEME_DIR = os.path.join(ROOT, APP_NAME + ".xcodeproj", "xcshareddata", "xcschemes")

# Directories that are themselves a single build artifact, not a folder to
# descend into. Walking into one finds its internals (a .png and a .json) and
# silently drops the catalog the compiler needs.
RESOURCE_DIR_EXTENSIONS = {".xcassets"}
RESOURCE_FILE_EXTENSIONS = {".xcprivacy"}
INFO_PLIST = "Info.plist"


def uid(*parts: str) -> str:
    """A stable 24-hex-char object id derived from a semantic key."""
    return hashlib.sha256("::".join(parts).encode("utf-8")).hexdigest()[:24].upper()


@dataclass
class Node:
    """One file on disk and its place in the project."""

    rel_path: str
    file_type: str
    is_source: bool
    is_resource: bool
    group_path: str
    ref_id: str
    build_id: str

    @property
    def name(self) -> str:
        return os.path.basename(self.rel_path)

    @property
    def phase(self) -> str:
        return "in Sources" if self.is_source else "in Resources"


def discover(root: str) -> list[Node]:
    """Walk a source root and turn every relevant file into a project node.

    Everything else — markdown, images, anything not a Swift file or a build
    resource — is deliberately left out. A resource nothing reads is bundle
    weight and a stale-copy risk.
    """
    nodes: list[Node] = []
    if not os.path.isdir(root):
        return nodes

    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        rel_dir = "" if rel_dir == "." else rel_dir.replace(os.sep, "/")

        # A resource bundle is a leaf: take it as a node and do not descend.
        bundles = [d for d in dirnames
                   if os.path.splitext(d)[1] in RESOURCE_DIR_EXTENSIONS]
        dirnames[:] = sorted(d for d in dirnames
                             if os.path.splitext(d)[1] not in RESOURCE_DIR_EXTENSIONS)

        for bundle in bundles:
            name = f"{rel_dir}/{bundle}" if rel_dir else bundle
            nodes.append(Node(name, "folder.assetcatalog", False, True, rel_dir,
                              uid("ref", root, name), uid("build", root, name)))

        for name in sorted(filenames):
            if name.startswith("."):
                continue
            ext = os.path.splitext(name)[1]
            rel = f"{rel_dir}/{name}" if rel_dir else name

            if ext == ".swift":
                nodes.append(Node(rel, "sourcecode.swift", True, False, rel_dir,
                                  uid("ref", root, rel), uid("build", root, rel)))
            elif ext in RESOURCE_FILE_EXTENSIONS:
                nodes.append(Node(rel, "text.plist.xml", False, True, rel_dir,
                                  uid("ref", root, rel), uid("build", root, rel)))
            elif name == INFO_PLIST and not rel_dir:
                # Referenced by INFOPLIST_FILE, never a build phase.
                nodes.append(Node(rel, "text.plist.xml", False, False, "",
                                  uid("ref", root, rel), uid("build", root, rel)))
    return nodes


def group_id(prefix: str, path: str = "") -> str:
    return uid("group", prefix, path)


def target_settings(is_app: bool) -> list[str]:
    """Build settings for one target, as pre-formatted pbxproj lines."""
    common = [
        "CODE_SIGN_IDENTITY = \"\";",
        "CODE_SIGNING_ALLOWED = NO;",
        "CODE_SIGN_STYLE = Manual;",
        "CURRENT_PROJECT_VERSION = 1;",
        "DEVELOPMENT_TEAM = \"\";",
        "IPHONEOS_DEPLOYMENT_TARGET = 17.0;",
        "MARKETING_VERSION = 1.0;",
        "SWIFT_VERSION = 5.0;",
        "TARGETED_DEVICE_FAMILY = \"1,2\";",
    ]
    if is_app:
        return common + [
            "ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;",
            f"INFOPLIST_FILE = {APP_NAME}/{INFO_PLIST};",
            "LD_RUNPATH_SEARCH_PATHS = (",
            "\t\t\t\t\t\"$(inherited)\",",
            "\t\t\t\t\t\"@executable_path/Frameworks\",",
            "\t\t\t\t);",
            "PRODUCT_BUNDLE_IDENTIFIER = com.galaxysportsedge.app;",
            "PRODUCT_NAME = \"$(TARGET_NAME)\";",
        ]
    # A unit-test bundle that loads the app as its host. Without TEST_HOST the
    # bundle cannot see the app's symbols and every `@testable import` fails at
    # link time with "no such module" — which reads like a project problem, not
    # a configuration one.
    return common + [
        "BUNDLE_LOADER = \"$(TEST_HOST)\";",
        "LD_RUNPATH_SEARCH_PATHS = (",
        "\t\t\t\t\t\"$(inherited)\",",
        "\t\t\t\t\t\"@executable_path/Frameworks\",",
        "\t\t\t\t\t\"@loader_path/Frameworks\",",
        "\t\t\t\t);",
        "PRODUCT_BUNDLE_IDENTIFIER = com.galaxysportsedge.app.tests;",
        "PRODUCT_NAME = \"$(TARGET_NAME)\";",
        f"TEST_HOST = \"$(BUILT_PRODUCTS_DIR)/{APP_NAME}.app/{APP_NAME}\";",
    ]


TARGETS = [
    # name, root dir, product type, wrapper type, is_app
    (APP_NAME, APP_DIR, "com.apple.product-type.application", "application", True),
    (TEST_NAME, TEST_DIR, "com.apple.product-type.bundle.unit-test", "cfbundle", False),
]


def build_pbxproj() -> str:
    discovered = {name: discover(path) for name, path, _, _, _ in TARGETS}
    out: list[str] = []
    w = out.append

    w("// !$*UTF8*$!")
    w("{")
    w("\tarchiveVersion = 1;")
    w("\tclasses = {")
    w("\t};")
    w("\tobjectVersion = 56;")
    w("\tobjects = {")
    w("")

    # ── PBXBuildFile ──────────────────────────────────────────────────────
    w("/* Begin PBXBuildFile section */")
    for name, _, _, _, _ in TARGETS:
        for node in discovered[name]:
            if not (node.is_source or node.is_resource):
                continue
            w(f"\t\t{node.build_id} /* {node.name} {node.phase} */ = "
              f"{{isa = PBXBuildFile; fileRef = {node.ref_id} /* {node.name} */; }};")
    w("/* End PBXBuildFile section */")
    w("")

    # ── PBXContainerItemProxy (test bundle -> app) ────────────────────────
    proxy_id = uid("proxy", TEST_NAME)
    w("/* Begin PBXContainerItemProxy section */")
    w(f"\t\t{proxy_id} /* PBXContainerItemProxy */ = {{")
    w("\t\t\tisa = PBXContainerItemProxy;")
    w(f"\t\t\tcontainerPortal = {uid('project')} /* Project object */;")
    w("\t\t\tproxyType = 1;")
    w(f"\t\t\tremoteGlobalIDString = {uid('target', APP_NAME)};")
    w(f"\t\t\tremoteInfo = {APP_NAME};")
    w("\t\t};")
    w("/* End PBXContainerItemProxy section */")
    w("")

    # ── PBXFileReference ──────────────────────────────────────────────────
    w("/* Begin PBXFileReference section */")
    for name, _, _, wrapper, _ in TARGETS:
        for node in discovered[name]:
            w(f"\t\t{node.ref_id} /* {node.name} */ = {{isa = PBXFileReference; "
              f"lastKnownFileType = {node.file_type}; path = {node.name}; "
              f"sourceTree = \"<group>\"; }};")
        w(f"\t\t{uid('product', name)} /* {name} */ = {{isa = PBXFileReference; "
          f"explicitFileType = wrapper.{wrapper}; includeInIndex = 0; "
          f"path = {name}; sourceTree = BUILT_PRODUCTS_DIR; }};")
    w("/* End PBXFileReference section */")
    w("")

    # ── PBXFrameworksBuildPhase ───────────────────────────────────────────
    w("/* Begin PBXFrameworksBuildPhase section */")
    for name, _, _, _, _ in TARGETS:
        w(f"\t\t{uid('phase', name, 'frameworks')} /* Frameworks */ = {{")
        w("\t\t\tisa = PBXFrameworksBuildPhase;")
        w("\t\t\tbuildActionMask = [PHONE];")
        w("\t\t\tfiles = (")
        w("\t\t\t);")
        w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
        w("\t\t};")
    w("/* End PBXFrameworksBuildPhase section */")
    w("")

    # ── PBXGroup ──────────────────────────────────────────────────────────
    products_group = uid("group", "Products")
    w("/* Begin PBXGroup section */")
    w(f"\t\t{uid('group', '<root>')} = {{")
    w("\t\t\tisa = PBXGroup;")
    w("\t\t\tchildren = (")
    for name, _, _, _, _ in TARGETS:
        w(f"\t\t\t\t{group_id(name)} /* {name} */,")
    w("\t\t\t);")
    w("\t\t\tsourceTree = \"<group>\";" if False else "\t\t\tsourceTree = \"<group>\";")
    w("\t\t};")
    w("")

    w(f"\t\t{products_group} /* Products */ = {{")
    w("\t\t\tisa = PBXGroup;")
    w("\t\t\tchildren = (")
    for name, _, _, _, _ in TARGETS:
        w(f"\t\t\t\t{uid('product', name)} /* {name} */,")
    w("\t\t\t);")
    w("\t\t\tname = Products;")
    w("\t\t\tsourceTree = \"<group>\";")
    w("\t\t};")

    for name, _, _, _, _ in TARGETS:
        nodes = discovered[name]
        w("")
        w(f"\t\t{group_id(name)} /* {name} */ = {{")
        w("\t\t\tisa = PBXGroup;")
        w("\t\t\tchildren = (")
        for child in sorted({n.group_path for n in nodes if n.group_path}):
            w(f"\t\t\t\t{group_id(name, child)} /* {child} */,")
        for node in nodes:
            if not node.group_path:
                w(f"\t\t\t\t{node.ref_id} /* {node.name} */,")
        w("\t\t\t);")
        w(f"\t\t\tname = {name};")
        w(f"\t\t\tpath = {name};")
        w("\t\t\tsourceTree = \"<group>\";")
        w("\t\t};")

        for child in sorted({n.group_path for n in nodes if n.group_path}):
            w("")
            w(f"\t\t{group_id(name, child)} /* {child} */ = {{")
            w("\t\t\tisa = PBXGroup;")
            w("\t\t\tchildren = (")
            for node in nodes:
                if node.group_path == child:
                    w(f"\t\t\t\t{node.ref_id} /* {node.name} */,")
            w("\t\t\t);")
            w(f"\t\t\tname = {child};")
            w(f"\t\t\tpath = {child};")
            w("\t\t\tsourceTree = \"<group>\";")
            w("\t\t};")
    w("/* End PBXGroup section */")
    w("")

    # ── PBXNativeTarget ───────────────────────────────────────────────────
    w("/* Begin PBXNativeTarget section */")
    for name, _, product_type, _, is_app in TARGETS:
        w(f"\t\t{uid('target', name)} /* {name} */ = {{")
        w("\t\t\tisa = PBXNativeTarget;")
        w(f"\t\t\tbuildConfigurationList = {uid('configlist', name)} "
          f"/* Build configuration list for PBXNativeTarget \"{name}\" */;")
        w("\t\t\tbuildPhases = (")
        w(f"\t\t\t\t{uid('phase', name, 'sources')} /* Sources */,")
        w(f"\t\t\t\t{uid('phase', name, 'frameworks')} /* Frameworks */,")
        w(f"\t\t\t\t{uid('phase', name, 'resources')} /* Resources */,")
        w("\t\t\t);")
        w("\t\t\tbuildRules = (")
        w("\t\t\t);")
        w("\t\t\tdependencies = (")
        if not is_app:
            w(f"\t\t\t\t{uid('dependency', name)} /* PBXTargetDependency */,")
        w("\t\t\t);")
        w(f"\t\t\tname = {name};")
        w(f"\t\t\tproductName = {name};")
        w(f"\t\t\tproductReference = {uid('product', name)} /* {name} */;")
        w(f"\t\t\tproductType = \"{product_type}\";")
        w("\t\t};")
    w("/* End PBXNativeTarget section */")
    w("")

    # ── PBXProject ────────────────────────────────────────────────────────
    w("/* Begin PBXProject section */")
    w(f"\t\t{uid('project')} /* Project object */ = {{")
    w("\t\t\tisa = PBXProject;")
    w(f"\t\t\tbuildConfigurationList = {uid('configlist', 'project')} "
      f"/* Build configuration list for PBXProject \"{APP_NAME}\" */;")
    w("\t\t\tcompatibilityVersion = \"Xcode 16.0\";")
    w("\t\t\tdevelopmentRegion = en;")
    w("\t\t\thasScannedForEncodings = 0;")
    w("\t\t\tknownRegions = (")
    w("\t\t\t\ten,")
    w("\t\t\t\tBase,")
    w("\t\t\t);")
    w(f"\t\t\tmainGroup = {uid('group', '<root>')};")
    w(f"\t\t\tproductRefGroup = {products_group} /* Products */;")
    w("\t\t\tprojectDirPath = \"\";")
    w("\t\t\tprojectRoot = \"\";")
    w("\t\t\ttargets = (")
    for name, _, _, _, _ in TARGETS:
        w(f"\t\t\t\t{uid('target', name)} /* {name} */,")
    w("\t\t\t);")
    w("\t\t};")
    w("/* End PBXProject section */")
    w("")

    # ── Build phases ──────────────────────────────────────────────────────
    for phase, kind in (("sources", "Sources"), ("resources", "Resources")):
        w(f"/* Begin PBX{kind}BuildPhase section */")
        for name, _, _, _, _ in TARGETS:
            w(f"\t\t{uid('phase', name, phase)} /* {kind} */ = {{")
            w(f"\t\t\tisa = PBX{kind}BuildPhase;")
            w("\t\t\tbuildActionMask = [PHONE];")
            w("\t\t\tfiles = (")
            for node in discovered[name]:
                want_source = phase == "sources"
                if (want_source and node.is_source) or (
                        not want_source and node.is_resource):
                    w(f"\t\t\t\t{node.build_id} /* {node.name} {node.phase} */,")
            w("\t\t\t);")
            w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
            w("\t\t};")
        w(f"/* End PBX{kind}BuildPhase section */")
        w("")

    # ── PBXTargetDependency ───────────────────────────────────────────────
    w("/* Begin PBXTargetDependency section */")
    w(f"\t\t{uid('dependency', TEST_NAME)} /* PBXTargetDependency */ = {{")
    w("\t\t\tisa = PBXTargetDependency;")
    w(f"\t\t\ttarget = {uid('target', APP_NAME)} /* {APP_NAME} */;")
    w(f"\t\t\ttargetProxy = {proxy_id} /* PBXContainerItemProxy */;")
    w("\t\t};")
    w("/* End PBXTargetDependency section */")
    w("")

    # ── XCBuildConfiguration ──────────────────────────────────────────────
    w("/* Begin XCBuildConfiguration section */")
    shared = [
        "ALWAYS_SEARCH_USER_PATHS = NO;",
        "CLANG_ANALYZER_NONNULL = YES;",
        "CLANG_CXX_LANGUAGE_STANDARD = \"gnu++20\";",
        "CLANG_ENABLE_MODULES = YES;",
        "CLANG_ENABLE_OBJC_ARC = YES;",
        "COPY_PHASE_STRIP = NO;",
        "ENABLE_STRICT_OBJC_MSGSEND = YES;",
        "GCC_C_LANGUAGE_STANDARD = gnu17;",
        "GCC_NO_COMMON_BLOCKS = YES;",
        "SDKROOT = iphoneos;",
        "SWIFT_VERSION = 5.0;",
    ]
    for config in ("Debug", "Release"):
        debug = config == "Debug"
        w(f"\t\t{uid('config', 'project', config)} /* {config} */ = {{")
        w("\t\t\tisa = XCBuildConfiguration;")
        w("\t\t\tbuildSettings = {")
        for line in shared:
            w(f"\t\t\t\t{line}")
        if debug:
            w("\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;")
            # The test target's `@testable import` needs the app built with
            # testability; without this the tests link but see nothing.
            w("\t\t\t\tENABLE_TESTABILITY = YES;")
            w("\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;")
            w("\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;")
            w("\t\t\t\tONLY_ACTIVE_ARCH = YES;")
            w("\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;")
            w("\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = \"-Onone\";")
        else:
            w("\t\t\t\tDEBUG_INFORMATION_FORMAT = \"dwarf-with-dsym\";")
            w("\t\t\t\tENABLE_NS_ASSERTIONS = NO;")
            w("\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;")
            w("\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;")
            w("\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = \"-O\";")
        w("\t\t\t};")
        w(f"\t\t\tname = {config};")
        w("\t\t};")

    for name, _, _, _, is_app in TARGETS:
        for config in ("Debug", "Release"):
            w(f"\t\t{uid('config', name, config)} /* {config} */ = {{")
            w("\t\t\tisa = XCBuildConfiguration;")
            w("\t\t\tbuildSettings = {")
            for line in target_settings(is_app):
                w(f"\t\t\t\t{line}")
            w("\t\t\t};")
            w(f"\t\t\tname = {config};")
            w("\t\t};")
    w("/* End XCBuildConfiguration section */")
    w("")

    # ── XCConfigurationList ──────────────────────────────────────────────
    w("/* Begin XCConfigurationList section */")
    w(f"\t\t{uid('configlist', 'project')} /* Build configuration list for "
      f"PBXProject \"{APP_NAME}\" */ = {{")
    w("\t\t\tisa = XCConfigurationList;")
    w("\t\t\tbuildConfigurations = (")
    w(f"\t\t\t\t{uid('config', 'project', 'Debug')} /* Debug */,")
    w(f"\t\t\t\t{uid('config', 'project', 'Release')} /* Release */,")
    w("\t\t\t);")
    w("\t\t\tdefaultConfigurationIsVisible = 0;")
    w("\t\t\tdefaultConfigurationName = Release;")
    w("\t\t};")
    for name, _, _, _, _ in TARGETS:
        w(f"\t\t{uid('configlist', name)} /* Build configuration list for "
          f"PBXNativeTarget \"{name}\" */ = {{")
        w("\t\t\tisa = XCConfigurationList;")
        w("\t\t\tbuildConfigurations = (")
        w(f"\t\t\t\t{uid('config', name, 'Debug')} /* Debug */,")
        w(f"\t\t\t\t{uid('config', name, 'Release')} /* Release */,")
        w("\t\t\t);")
        w("\t\t\tdefaultConfigurationIsVisible = 0;")
        w("\t\t\tdefaultConfigurationName = Release;")
        w("\t\t};")
    w("/* End XCConfigurationList section */")
    w("\t};")
    w(f"\trootObject = {uid('project')} /* Project object */;")
    w("}")

    counts = {name: len(discovered[name]) for name, _, _, _, _ in TARGETS}
    return "\n".join(out) + "\n", counts


SCHEME_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1600"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{app_target}"
               BuildableName = "{app}.app"
               BlueprintName = "{app}"
               ReferencedContainer = "container:{app}.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
         <TestableReference
            skipped = "NO">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{test_target}"
               BuildableName = "{test}.xctest"
               BlueprintName = "{test}"
               ReferencedContainer = "container:{app}.xcodeproj">
            </BuildableReference>
         </TestableReference>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{app_target}"
            BuildableName = "{app}.app"
            BlueprintName = "{app}"
            ReferencedContainer = "container:{app}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{app_target}"
            BuildableName = "{app}.app"
            BlueprintName = "{app}"
            ReferencedContainer = "container:{app}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""


def main() -> int:
    check = "--check" in sys.argv
    pbx, counts = build_pbxproj()
    scheme = SCHEME_TEMPLATE.format(
        app=APP_NAME, test=TEST_NAME,
        app_target=uid("target", APP_NAME),
        test_target=uid("target", TEST_NAME),
    )

    os.makedirs(SCHEME_DIR, exist_ok=True)
    scheme_path = os.path.join(SCHEME_DIR, APP_NAME + ".xcscheme")

    if check:
        problems = []
        for path, content in ((PBXPROJ, pbx), (scheme_path, scheme)):
            try:
                with open(path, "r", encoding="utf-8") as handle:
                    on_disk = handle.read()
            except FileNotFoundError:
                problems.append("missing: " + path)
                continue
            if on_disk != content:
                problems.append("stale: " + path)
        if problems:
            print("project.pbxproj is out of date with the source tree:")
            for problem in problems:
                print("  " + problem)
            print("run: python3 ios/generate_project.py")
            return 1
        print("project.pbxproj matches the source tree")
        return 0

    with open(PBXPROJ, "w", encoding="utf-8") as handle:
        handle.write(pbx)
    with open(scheme_path, "w", encoding="utf-8") as handle:
        handle.write(scheme)
    print("wrote " + PBXPROJ)
    print("wrote " + scheme_path)
    for name, count in counts.items():
        print("  %-24s %d files" % (name, count))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
