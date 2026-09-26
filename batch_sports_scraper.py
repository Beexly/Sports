#!/usr/bin/env python3
"""
Batch Sports Prediction Research Scraper
Fixed version with proper JSON serialization for datetime objects
"""

import arxiv
import pandas as pd
import json
import time
import random
from datetime import datetime
from typing import List, Dict
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/minis/batch_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BatchSportsPredictionScraper:
    def __init__(self):
        self.client = arxiv.Client()
        self.scraped_papers = []
        self.start_time = datetime.now()
        
        # All 71 queries for comprehensive coverage
        self.search_queries = [
            "sports api", "sports learning", "machine learning", "probability learning",
            "sports data", "sports database", "sports equations", "sports",
            "gambling", "betting", "bets", "prediction theory", "prediction equations",
            "prediction in cognitive abilities", "prediction in physical abilities",
            "sports prediction api", "sports analytics api", "sports data analysis",
            "sports database architecture", "sports equation modeling", "probability models sports",
            "statistical sports prediction", "sports betting algorithms", "sports gambling models",
            "sports prediction theory", "sports prediction mathematics", "cognitive sports prediction",
            "physical sports prediction", "athlete performance prediction", "sports injury prediction",
            "sports training prediction", "sports performance modeling", "sports analytics algorithms",
            "sports data mining", "sports knowledge extraction", "sports intelligence systems",
            "sports decision making", "sports strategy prediction", "sports outcome prediction",
            "sports risk assessment", "sports optimization", "sports forecasting",
            "sports simulation", "sports modeling", "sports analytics engineering",
            "sports data science", "sports machine learning", "sports deep learning",
            "sports neural networks", "sports ai", "sports intelligent systems",
            "sports autonomous prediction", "sports automated betting", "sports quantitative analysis",
            "sports financial modeling", "sports risk management", "sports portfolio optimization",
            "sports market prediction", "sports odds analysis", "sports line prediction",
            "sports spreads analysis", "sports totals prediction", "sports prop bets",
            "sports futures prediction", "sports player prediction", "sports team prediction",
            "sports matchup prediction", "sports weather prediction", "sports venue prediction",
            "sports conditions prediction", "sports environment prediction"
        ]
        
        # Remove duplicates while preserving order
        self.search_queries = list(dict.fromkeys(self.search_queries))
        
        # Batch configuration
        self.queries_per_batch = 5  # Run 5 queries at a time
        self.max_papers_per_query = 50
        
    def scrape_query_range(self, start_idx: int, end_idx: int, batch_num: int):
        """Scrape a specific range of queries for the batch"""
        logger.info(f"🔄 Batch {batch_num}: Processing queries {start_idx+1} to {end_idx}")
        
        batch_papers = []
        
        for i in range(start_idx, min(end_idx, len(self.search_queries))):
            query = self.search_queries[i]
            logger.info(f"📝 Query {i+1}/{len(self.search_queries)}: '{query}'")
            
            try:
                search = arxiv.Search(
                    query=query,
                    max_results=self.max_papers_per_query,
                    sort_by=arxiv.SortCriterion.Relevance,
                    sort_order=arxiv.SortOrder.Descending
                )
                
                for result in self.client.results(search):
                    # Convert datetime objects to ISO format strings for JSON serialization
                    published_str = result.published.isoformat() if hasattr(result.published, 'isoformat') else str(result.published)
                    
                    paper = {
                        'id': result.entry_id,
                        'title': result.title.strip(),
                        'abstract': result.summary.strip(),
                        'authors': [author.name for author in result.authors],
                        'published': published_str,  # ISO format string
                        'categories': result.categories,
                        'pdf_url': result.pdf_url,
                        'search_query': query,
                        'batch_number': batch_num,
                        'query_position': i + 1,
                        'scraped_timestamp': datetime.now().isoformat(),
                        'word_count': len(result.title.split()) + len(result.summary.split()),
                        'has_code': any(ext in result.title.lower() or result.summary.lower() 
                                       for ext in ['code', 'github', 'implementation', 'dataset']),
                        'has_math': any(ext in result.title.lower() or result.summary.lower()
                                       for ext in ['equation', 'formula', 'mathematical', 'math'])
                    }
                    batch_papers.append(paper)
                    
                    # Respectful delay between papers
                    time.sleep(random.uniform(0.3, 1.0))
                    
            except Exception as e:
                logger.error(f"❌ Error processing query '{query}': {e}")
                continue
            
            # Progress update within batch
            if (i + 1) % 2 == 0:
                logger.info(f"📊 Batch {batch_num} progress: {i+1} queries processed, {len(batch_papers)} papers collected")
        
        return batch_papers
    
    def categorize_paper(self, paper: Dict) -> Dict:
        """Categorize papers based on user's focus areas"""
        text = (paper['title'] + ' ' + paper['abstract']).lower()
        user_categories = []
        
        # User's specific areas mapping
        user_area_keywords = {
            'sports_api': ['sports api', 'sports analytics api', 'sports database api'],
            'sports_learning': ['sports learning', 'sports machine learning', 'sports deep learning'],
            'machine_learning': ['machine learning', 'deep learning', 'neural network'],
            'probability_learning': ['probability', 'probabilistic', 'bayesian'],
            'sports_data': ['sports data', 'sports analytics', 'sports data mining'],
            'sports_database': ['sports database', 'sports database architecture'],
            'sports_equations': ['sports equation', 'sports mathematical', 'sports formula'],
            'sports': ['sports prediction', 'sports modeling', 'sports simulation'],
            'gambling': ['gambling', 'betting', 'sportsbook'],
            'betting': ['betting', 'wagering', 'stakes'],
            'bets': ['bets', 'bet types', 'betting markets'],
            'prediction_theory': ['prediction theory', 'prediction methodology'],
            'prediction_equations': ['prediction equation', 'prediction formula'],
            'cognitive_abilities': ['cognitive', 'mental', 'psychological', 'decision making'],
            'physical_abilities': ['physical', 'athletic', 'performance', 'training']
        }
        
        # Determine which user areas this paper matches
        for area, keywords in user_area_keywords.items():
            if any(keyword in text for keyword in keywords):
                user_categories.append(area)
        
        paper['user_areas'] = user_categories
        paper['primary_user_area'] = user_categories[0] if user_categories else 'other'
        
        # Enhanced categorization
        enhanced_categories = []
        
        if any(word in text for word in ['machine learning', 'deep learning', 'neural network', 'ai']):
            enhanced_categories.append('ML/AI')
        if any(word in text for word in ['statistical', 'bayesian', 'probability', 'time series']):
            enhanced_categories.append('Statistical')
        if any(word in text for word in ['equation', 'formula', 'mathematical', 'math model']):
            enhanced_categories.append('Mathematical Modeling')
        if any(word in text for word in ['api', 'database', 'data', 'analytics']):
            enhanced_categories.append('Data Engineering')
        if any(word in text for word in ['betting', 'gambling', 'odds', 'market']):
            enhanced_categories.append('Betting Analytics')
        
        paper['enhanced_categories'] = enhanced_categories
        paper['primary_category'] = enhanced_categories[0] if enhanced_categories else 'Other'
        
        return paper
    
    def run_batch_mode(self, batch_num: int, start_query: int, end_query: int):
        """Run a specific batch"""
        logger.info(f"🚀 BATCH {batch_num}: Starting targeted scraping")
        logger.info(f"📊 Processing queries {start_query} to {end_query}")
        
        batch_papers = self.scrape_query_range(start_query - 1, end_query, batch_num)
        
        # Categorize all papers in this batch
        categorized_papers = [self.categorize_paper(paper) for paper in batch_papers]
        
        logger.info(f"✅ Batch {batch_num} completed: {len(categorized_papers)} papers collected")
        
        # Save batch results
        self.save_batch_results(batch_num, categorized_papers)
        
        return categorized_papers
    
    def save_batch_results(self, batch_num: int, papers: List[Dict]):
        """Save batch results to files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save main batch CSV
        batch_csv = f"/var/minis/sports_prediction_batch_{batch_num}.csv"
        df = pd.DataFrame(papers)
        df.to_csv(batch_csv, index=False, encoding='utf-8')
        logger.info(f"📄 Batch {batch_num} CSV saved: {batch_csv}")
        
        # Save batch JSON (with datetime objects converted to strings)
        batch_json = f"/var/minis/sports_prediction_batch_{batch_num}.json"
        try:
            # Convert datetime objects to ISO strings for JSON
            papers_for_json = []
            for paper in papers:
                paper_copy = paper.copy()
                # Ensure all datetime objects are converted to strings
                for key, value in paper_copy.items():
                    if isinstance(value, datetime):
                        paper_copy[key] = value.isoformat()
                papers_for_json.append(paper_copy)
            
            with open(batch_json, 'w', encoding='utf-8') as f:
                json.dump(papers_for_json, f, indent=2, ensure_ascii=False)
            logger.info(f"📄 Batch {batch_num} JSON saved: {batch_json}")
        except Exception as e:
            logger.error(f"❌ Error saving JSON for batch {batch_num}: {e}")
            # Save CSV as fallback
            logger.info(f"📄 Saving CSV as fallback for batch {batch_num}")
        
        # Add to main collection
        self.scraped_papers.extend(papers)
    
    def run_all_batches(self):
        """Run all batches in sequence"""
        total_batches = (len(self.search_queries) + self.queries_per_batch - 1) // self.queries_per_batch
        
        logger.info(f"🚀 Starting Batch Mode - {total_batches} batches of {self.queries_per_batch} queries each")
        logger.info(f"📊 Total queries: {len(self.search_queries)}")
        logger.info(f"📈 Total estimated papers: {len(self.search_queries) * self.max_papers_per_query:,}")
        logger.info(f"⏱️  Estimated total time: {total_batches * 2} - {total_batches * 4} hours")
        
        for batch_num in range(1, total_batches + 1):
            start_query = (batch_num - 1) * self.queries_per_batch + 1
            end_query = min(batch_num * self.queries_per_batch, len(self.search_queries))
            
            print(f"\n{'='*80}")
            print(f"🔄 EXECUTING BATCH {batch_num} OF {total_batches}")
            print(f"📝 Processing queries {start_query} to {end_query}")
            print(f"📊 Topics: {', '.join(self.search_queries[start_query-1:end_query])}")
            print(f"{'='*80}")
            
            # Run the batch
            batch_papers = self.run_batch_mode(batch_num, start_query, end_query)
            
            # Save batch results
            self.save_batch_results(batch_num, batch_papers)
            
            # Progress update
            total_processed = batch_num * self.queries_per_batch
            progress = (total_processed / len(self.search_queries)) * 100
            logger.info(f"📊 OVERALL PROGRESS: {progress:.1f}% complete")
            logger.info(f"📈 Total papers collected so far: {len(self.scraped_papers):,}")
            
            # Wait between batches
            if batch_num < total_batches:
                logger.info(f"⏳ Waiting 60 seconds before next batch...")
                time.sleep(60)
        
        # Generate final reports
        self.generate_final_reports()
        
        logger.info(f"\n🎉 ALL BATCHES COMPLETED!")
        logger.info(f"📊 Total papers collected: {len(self.scraped_papers):,}")
        logger.info(f"📁 Total batches: {total_batches}")
        logger.info(f"⏱️ Total duration: {datetime.now() - self.start_time}")
        
        return self.scraped_papers
    
    def generate_final_reports(self):
        """Generate comprehensive final reports"""
        if not self.scraped_papers:
            logger.warning("No papers to generate reports for")
            return
        
        df = pd.DataFrame(self.scraped_papers)
        
        # Create comprehensive summary
        summary = {
            'metadata': {
                'total_papers': len(df),
                'total_batches': len(set(df['batch_number'])),
                'queries_processed': len(self.search_queries),
                'start_time': self.start_time.isoformat(),
                'end_time': datetime.now().isoformat(),
                'duration_hours': float((datetime.now() - self.start_time).total_seconds() / 3600)
            },
            'user_area_breakdown': df['primary_user_area'].value_counts().to_dict(),
            'batch_performance': df['batch_number'].value_counts().to_dict(),
            'enhanced_category_breakdown': self._get_enhanced_categories_summary(df),
            'technical_assets': {
                'papers_with_code': df['has_code'].sum(),
                'papers_with_math': df['has_math'].sum(),
                'avg_word_count': df['word_count'].mean(),
                'recent_papers': df['published'].max() if not df['published'].empty else None
            },
            'research_value': self._calculate_research_value(df)
        }
        
        # Save comprehensive summary
        summary_file = "/var/minis/sports_prediction_batch_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, default=str)
        logger.info(f"📊 Comprehensive summary saved: {summary_file}")
        
        # Create quick reference
        self.create_quick_reference(df, summary)
        
        # Log key insights
        self.log_key_insights(summary)
    
    def _get_enhanced_categories_summary(self, df: pd.DataFrame):
        """Get summary of enhanced categories"""
        category_counts = {}
        for categories in df['enhanced_categories']:
            for category in categories:
                category_counts[category] = category_counts.get(category, 0) + 1
        return category_counts
    
    def _calculate_research_value(self, df: pd.DataFrame):
        """Calculate research value score for each paper"""
        def calculate_value(paper):
            score = 0
            # User area match bonus
            score += len(paper['user_areas']) * 10
            
            # Technical assets bonus
            if paper.get('has_code', False):
                score += 20
            if paper.get('has_math', False):
                score += 15
            
            # Category diversity bonus
            score += len(paper['enhanced_categories']) * 5
            
            return score
        
        df['research_value_score'] = df.apply(calculate_value, axis=1)
        
        return {
            'total_score': df['research_value_score'].sum(),
            'avg_score': df['research_value_score'].mean(),
            'top_score': df['research_value_score'].max(),
            'high_value_papers': len(df[df['research_value_score'] > 30]),
            'top_performers': df.nlargest(5, 'research_value_score')[['id', 'title', 'research_value_score']].to_dict('records')
        }
    
    def create_quick_reference(self, df: pd.DataFrame, summary: Dict):
        """Create quick reference for immediate use"""
        quick_ref = {
            'summary': f"🚀 Batch Sports Prediction Research Scraper completed",
            'total_papers': len(df),
            'batches_completed': summary['metadata']['total_batches'],
            'user_areas_covered': list(df['primary_user_area'].value_counts().index[:10].astype(str)),
            'top_research_areas': df['primary_user_area'].value_counts().head(5).to_dict(),
            'technical_readiness': f"{df['has_code'].sum()}/{len(df)} papers have code implementations",
            'research_value': f"Average score {summary['research_value']['avg_score']:.1f}",
            'immediate_next_steps': [
                "Review top 10 papers by research value score",
                "Focus on highest-value user areas",
                "Leverage code assets for rapid prototyping",
                "Use mathematical papers for equation-based models",
                "Continue with remaining batches for full coverage"
            ],
            'files_generated': [
                f"sports_prediction_batch_1-{4}.csv (partial results)",
                f"sports_prediction_batch_summary.json (comprehensive analysis)",
                "Additional batch files as completed"
            ]
        }
        
        quick_ref_file = "/var/minis/QUICK_REFERENCE.md"
        with open(quick_ref_file, 'w', encoding='utf-8') as f:
            f.write(f"# 🚀 Quick Reference: Batch Sports Prediction Research\n\n")
            f.write(f"## Summary\n{quick_ref['summary']}\n\n")
            f.write(f"## Key Metrics\n")
            f.write(f"- **Total Papers Found**: {quick_ref['total_papers']:,}\n")
            f.write(f"- **Batches Completed**: {quick_ref['batches_completed']}\n")
            f.write(f"- **User Areas Covered**: {quick_ref['user_areas_covered']}\n")
            f.write(f"- **Technical Readiness**: {quick_ref['technical_readiness']}\n")
            f.write(f"- **Research Value**: {quick_ref['research_value']}\n\n")
            f.write(f"## Top Research Areas\n")
            for area, count in quick_ref['top_research_areas'].items():
                f.write(f"- **{area}**: {count:,} papers\n")
            
            f.write(f"\n## Immediate Next Steps\n")
            for i, step in enumerate(quick_ref['immediate_next_steps'], 1):
                f.write(f"{i}. {step}\n")
            
            f.write(f"\n## Generated Files\n")
            for file_path in quick_ref['files_generated']:
                f.write(f"- `{file_path}`\n")
        
        logger.info(f"📋 QUICK REFERENCE CREATED: {quick_ref_file}")
    
    def log_key_insights(self, summary: Dict):
        """Log key insights from the batch scraping"""
        logger.info(f"\n🎯 KEY INSIGHTS FROM BATCH EXECUTION:")
        
        user_areas = summary['user_area_breakdown']
        top_user_area = list(user_areas.keys())[0]
        top_user_area_count = user_areas[top_user_area]
        
        logger.info(f"   🌟 Hottest research area: {top_user_area} ({top_user_area_count:,} papers)")
        logger.info(f"   📈 Coverage across {len(user_areas)} different user areas")
        logger.info(f"   💻 Technical quality: {summary['technical_assets']['papers_with_code']:,} papers with code")
        logger.info(f"   🧮 Mathematical depth: {summary['technical_assets']['papers_with_math']:,} papers with equations")
        logger.info(f"   🎓 Research value: Average score {summary['research_value']['avg_score']:.1f}")
        
        logger.info(f"\n🚀 EXECUTION SUMMARY:")
        logger.info(f"   • {summary['metadata']['total_batches']} batches completed")
        logger.info(f"   • {len(user_areas)} user areas covered")
        logger.info(f"   • {summary['metadata']['duration_hours']:.1f} hours total duration")
        logger.info(f"   • Ready for immediate implementation and analysis")

def main():
    """Main execution function for batch mode"""
    print("🚀 BATCH SPORTS PREDICTION RESEARCH SCRAPER")
    print("=" * 80)
    print("Target: Branch B83e12f - Comprehensive sports prediction research")
    print("Approach: Multi-batch execution for manageable data collection")
    print("Coverage: 71 queries / 5,300+ papers")
    print("Timeline: 4-6 hours total")
    print("=" * 80)
    
    scraper = BatchSportsPredictionScraper()
    
    try:
        papers = scraper.run_all_batches()
        
        print(f"\n✅ BATCH EXECUTION COMPLETED SUCCESSFULLY!")
        print(f"📊 Total papers collected: {len(papers):,}")
        print(f"📁 Batches completed: {len(set([p['batch_number'] for p in papers]))}")
        print(f"🎯 User areas covered: {len(set([p['primary_user_area'] for p in papers]))}")
        print(f"💻 Papers with code: {papers.sum(axis=1)['has_code']:,}")
        print(f"🧮 Papers with equations: {papers.sum(axis=1)['has_math']:,}")
        
        print(f"\n📁 Generated Files:")
        print(f"   - sports_prediction_batch_*.csv (individual batch results)")
        print(f"   - sports_prediction_batch_summary.json (comprehensive analysis)")
        print(f"   - QUICK_REFERENCE.md (immediate usage guide)")
selfprint(f"   - batch_scraper.log (detailed execution log)")
        
        print(f"\n🚀 READY FOR IMPLEMENTATION!")
        print(f"📊 Use the generated files for sports prediction research and development")
        print(f"🎯 Focus on highest-value papers for immediate projects")
        
    except KeyboardInterrupt:
        print(f"\n⚠️  Execution interrupted by user")
        if scraper.scraped_papers:
            logger.warning(f"Partial results: {len(scraped_papers):,} papers collected")
            print(f"✅ Partial batch execution completed")
    except Exception as e:
        print(f"\n❌ Error during execution: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()