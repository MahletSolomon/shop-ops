'use client'

import React, { useState, useMemo } from 'react' // Added useMemo for performance
import PageTitle from '@/app/components/ui/PageTitle'
import Card  from '@/app/components/ui/Card'
import { DollarSign, TrendingUp } from 'lucide-react'
import { ProductTabs } from '@/app/components/ui/ProductTabs'
import { ProductTable } from '@/app/components/tables/ProductTable'


const Inventory = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // dummy products data
  const allProducts = [
    { id: 1, name: "Bottled Water (pack)", sku: "BW-012", category: "Beverages", qty: 0, price: "₦ 150.00", status: "Out of Stock" },
    { id: 2, name: "Tomato Paste (400g)", sku: "TP-400", category: "Canned", qty: 0, price: "₦ 55.00", status: "Out of Stock" },
    { id: 3, name: "Milk (1L)", sku: "MLK-001", category: "Beverages", qty: 15, price: "₦ 800.00", status: "In Stock" },
  ]

  // filter logic
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'out' ? product.status === 'Out of Stock' :
        activeTab === 'low' ? product.qty > 0 && product.qty < 10 : true;

      return matchesSearch && matchesTab;
    });
  }, [activeTab, searchQuery]);

  const tabOptions = [
    { id: 'all', label: 'All', count: allProducts.length },
    { id: 'low', label: 'Low', count: allProducts.filter(p => p.qty > 0 && p.qty < 10).length },
    { id: 'out', label: 'Out', count: allProducts.filter(p => p.status === 'Out of Stock').length },
  ]

  return (
    <div className='flex flex-col space-y-4'>
      <PageTitle
        title="Inventory"
        subtitle="Manage your product stock levels"
      />

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card
          title=""
          value="5"
          icon={TrendingUp}
          iconWrapperClass="bg-red-50 text-red-600"
          trend=""
          trendDirection=""
          description="In Stock"
        />

        <Card
          title=""
          value="3"
          icon={DollarSign}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description="Low Stock"
        />

        

        <Card
          title=""
          value="3"
          icon={DollarSign}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description="Out of Stock"
        />


      </div>

      <div className="space-y-4">
        <ProductTabs
          tabs={tabOptions}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSearch={setSearchQuery}
        />
        
        {/* table with filtered list */}
        <ProductTable 
          products={filteredProducts} 
          onRestock={(id) => console.log('Restocking:', id)} 
        />
      </div>



    </div>
  )
}

export default Inventory